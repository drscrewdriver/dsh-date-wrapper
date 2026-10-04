/**
 * test-host-compat.mjs —— 本地隔离矩阵执行体（improve-dsh-plugins/enum-peer-migration
 * /INDEX.md §E：`_wt` 工作树 + 离线 tgz 的 CI 前身）。
 *
 * 每格 = 一个宿主 rc：
 *   1. tgz 缓存（`npm pack @deepseek-ai/dsh@<version>`，落 `.compat-results/host-tgz/`）；
 *   2. 隔离安装：`.compat-results/matrix/<v>/host/` 装 tgz，`home/` 做独立 DSH_HOME，
 *      `home/profiles/matrix/` 以 `file:` 装本仓库工作树（dsh.profile.bundles 声明装配）；
 *   3. 无头启动 `dsh web --port <p>`（DSH_HOME 指向格子 home），就绪行或超时即杀；
 *   4. 断言（checklist §4.1 通用四断言的装载级部分）落 `result.json`：
 *      booted（就绪横幅）/ noCompatBlock（无 peer 闸门拦截）/ noMountError（无挂载/
 *      审计错误）/ noDupContext（无重名注册报错）；快照级语义由 tests/ 覆盖（22 用例）。
 *
 * 产物：`matrix/<v>/{boot.log,result.json}` + 汇总 `results.json`；绿名单写
 * `verified.json`（sync-hosts 据此生成四语 README 的 Runtime-verified 行）。
 *
 * 用法：
 *   node scripts/test-host-compat.mjs                     # 全量（hosts.mjs 枚举）
 *   node scripts/test-host-compat.mjs --only 0.2.0-rc.2   # 单格复跑
 *   node scripts/test-host-compat.mjs --keep              # 保留 node_modules
 *   node scripts/test-host-compat.mjs --force             # 忽略已有绿结果强制重跑
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { supportedHosts } from './hosts.mjs'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const RESULTS = path.join(ROOT, '.compat-results')
const MATRIX = path.join(RESULTS, 'matrix')
const TGZ_CACHE = path.join(RESULTS, 'host-tgz')
const WIN32 = process.platform === 'win32'
const NPM = WIN32 ? 'npm.cmd' : 'npm'

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined
const keep = args.includes('--keep')
const force = args.includes('--force')
const timeoutMs = (() => {
  const at = args.indexOf('--timeout')
  return at === -1 ? 150_000 : Number(args[at + 1]) * 1000
})()
const versions = only ? [only] : [...supportedHosts]

const NPM_QUIET = ['install', '--no-audit', '--no-fund', '--loglevel=error']

/** 顺序跑外部命令，非零退出时带尾巴抛错。（win32 的 npm.cmd 必须经 shell 启动） */
function run(cwd, cmd, cmdArgs, label) {
  const r = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', shell: WIN32, windowsHide: true })
  if (r.status !== 0) {
    throw new Error(
      `${label} 失败（exit ${r.status}${r.error ? `，${r.error.code ?? r.error.message}` : ''}）\nstdout: ${(r.stdout ?? '').slice(-800)}\nstderr: ${(r.stderr ?? '').slice(-800)}`,
    )
  }
  return r
}

async function ensureTgz(version) {
  await mkdir(TGZ_CACHE, { recursive: true })
  const dest = path.join(TGZ_CACHE, `deepseek-ai-dsh-${version}.tgz`)
  if (existsSync(dest)) return dest
  console.log(`pack   @deepseek-ai/dsh@${version}`)
  await run(TGZ_CACHE, NPM, ['pack', `@deepseek-ai/dsh@${version}`, '--loglevel=error'], `npm pack ${version}`)
  return dest
}

/** 就绪横幅（宽松：老版本横幅不一定带 dsh 前缀）。 */
const READY_RE = /https?:\/\/(127\.0\.0\.1|localhost):/
const COMPAT_BLOCK_RE = /is incompatible with dsh/
const AUDIT_RE = /startup audit|failed to mount|mount error|failed to start/i
const DUP_RE = /already (been )?registered|duplicate|conflict/i

async function runCell(version) {
  const cell = path.join(MATRIX, version)
  const hostDir = path.join(cell, 'host')
  const homeDir = path.join(cell, 'home')
  const profileDir = path.join(homeDir, 'profiles', 'matrix')
  const bootLog = path.join(cell, 'boot.log')
  await mkdir(path.join(hostDir), { recursive: true })
  await mkdir(profileDir, { recursive: true })
  const checks = { version, booted: false, noCompatBlock: true, noMountError: true, noDupContext: true, notes: [] }

  // 1. tgz + 隔离宿主安装
  const tgz = await ensureTgz(version)
  const hostPkg = path.join(hostDir, 'package.json')
  if (!existsSync(path.join(hostDir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'))) {
    await writeFile(hostPkg, JSON.stringify({ name: 'dsh-host-cell', private: true, dependencies: { '@deepseek-ai/dsh': pathToFileURL(tgz).href } }, null, 2))
    console.log(`install host ${version} …`)
    await run(hostDir, NPM, NPM_QUIET, `install host ${version}`)
  }
  checks.hostInstalled = JSON.parse(await readFile(path.join(hostDir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), 'utf8')).version === version
  if (!checks.hostInstalled) throw new Error(`宿主安装版本与格子不符: ${version}`)

  // 2. 隔离 profile：file: 装本仓库工作树
  await writeFile(path.join(profileDir, 'package.json'), JSON.stringify({
    name: 'dsh-profile-matrix',
    private: true,
    dependencies: { 'dsh-date-wrapper': pathToFileURL(ROOT).href },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-date-wrapper'] } },
  }, null, 2))
  if (!existsSync(path.join(profileDir, 'node_modules', 'dsh-date-wrapper', 'package.json'))) {
    console.log(`install profile ${version} …`)
    await run(profileDir, NPM, NPM_QUIET, `install profile ${version}`)
  }

  // 3. 无头启动（独立 DSH_HOME + 独立端口），就绪或超时即杀。
  //    --no-open 防止每格弹一个浏览器；老版本若不认识该旗标（usage error）则去旗标重试。
  const binJs = path.join(hostDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  const port = 3121 + versions.indexOf(version)
  const bootOnce = async (extraArgs) => {
    const child = spawn(process.execPath, [binJs, 'web', ...extraArgs, '--port', String(port)], {
      cwd: cell,
      env: { ...process.env, DSH_HOME: homeDir },
      windowsHide: true,
    })
    let log = ''
    const got = (re) => re.test(log)
    child.stdout.on('data', (d) => { log += d })
    child.stderr.on('data', (d) => { log += d })
    const done = new Promise((resolve) => child.on('exit', (code) => resolve({ exited: true, code })))
    const timer = new Promise((resolve) => setTimeout(() => resolve({ exited: false }), timeoutMs))
    let outcome = await Promise.race([done, timer, (async () => {
      while (!got(READY_RE)) await new Promise((r) => setTimeout(r, 500))
      return { ready: true }
    })()])
    if (!outcome.ready && !outcome.exited) outcome = { timeout: true }
    if (outcome.ready || outcome.timeout) {
      if (WIN32) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true })
      else child.kill('SIGKILL')
    }
    return { outcome, log }
  }
  let { outcome, log } = await bootOnce(['--no-open'])
  if (!outcome.ready && /--no-open/.test(log) && /(usage|unknown option|invalid option)/i.test(log)) {
    checks.notes.push('--no-open 不被该版本识别，去旗标重试')
    ;({ outcome, log } = await bootOnce([]))
  }
  if (outcome.exited && !outcome.ready) {
    checks.notes.push(`boot 提前退出（exit ${outcome.code}）`)
  }
  await writeFile(bootLog, log)

  // 4. 断言
  checks.booted = Boolean(outcome.ready)
  if (outcome.timeout) checks.notes.push('就绪横幅超时')
  checks.noCompatBlock = !COMPAT_BLOCK_RE.test(log)
  checks.noMountError = !AUDIT_RE.test(log)
  checks.noDupContext = !log.split('\n').some((line) => /date-wrapper/.test(line) && DUP_RE.test(line))
  checks.green = checks.booted && checks.noCompatBlock && checks.noMountError && checks.noDupContext
  if (!checks.noCompatBlock) checks.notes.push('peer 闸门拦截（is incompatible with dsh）')
  if (!checks.noMountError) checks.notes.push('挂载/审计错误')
  if (!checks.noDupContext) checks.notes.push('疑似重名注册')
  await writeFile(path.join(cell, 'result.json'), JSON.stringify(checks, null, 2) + '\n')
  return checks
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
await mkdir(MATRIX, { recursive: true })
const results = []
for (const version of versions) {
  const cellResult = path.join(MATRIX, version, 'result.json')
  if (!force && existsSync(cellResult)) {
    const prev = JSON.parse(await readFile(cellResult, 'utf8'))
    if (prev.green) {
      console.log(`skip   ${version}（已有绿结果，--force 重跑）`)
      results.push(prev)
      continue
    }
  }
  process.stdout.write(`cell   ${version} … `)
  try {
    const checks = await runCell(version)
    console.log(checks.green ? 'GREEN' : `RED（${checks.notes.join('；') || '见 result.json'}）`)
    results.push(checks)
  } catch (error) {
    console.log('ERROR')
    const checks = { version, green: false, error: String(error.message ?? error) }
    results.push(checks)
    await mkdir(path.join(MATRIX, version), { recursive: true })
    await writeFile(path.join(MATRIX, version, 'result.json'), JSON.stringify(checks, null, 2) + '\n')
  }
  if (!keep) {
    for (const dir of ['host/node_modules', 'home/profiles/matrix/node_modules']) {
      await rm(path.join(MATRIX, version, ...dir.split('/')), { recursive: true, force: true })
    }
  }
}

const verified = results.filter((r) => r.green).map((r) => r.version)
const failed = results.filter((r) => !r.green).map((r) => r.version)
await writeFile(path.join(RESULTS, 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2) + '\n')
await writeFile(path.join(RESULTS, 'verified.json'), JSON.stringify({ generatedAt: new Date().toISOString(), verified, failed }, null, 2) + '\n')
console.log(`\n绿 ${verified.length}/${results.length}: ${verified.join(', ') || '（无）'}`)
if (failed.length) console.log(`红 ${failed.length}: ${failed.join(', ')}`)
if (!only) console.log('下一步：node scripts/sync-hosts.mjs --write  # 把 verified 清单下发四语 README')
