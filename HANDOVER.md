# HANDOVER — dsh-date-wrapper

> 面向「下一个会话 / 下一个协作者」的交接文档。目标：15 分钟看懂全貌，30 分钟能改代码。
> 结构参照 `improve-dsh-plugins/02-handover-markdown-pattern.md` 的模板。

---

## 0. 一句话背景

`dsh-date-wrapper` 是一个 **DSH host 插件**：把当前日期注册为一条**动态运行上下文**，由平台并入自己那条「Current runtime context」快照消息，模型看到的是 `Current date: 2026-09-08 Asia/Shanghai Tuesday`。

- 仓库：https://github.com/drscrewdriver/dsh-date-wrapper（public，默认分支 `main`）
- npm：**未发布**（当前安装方式 = 本地路径 / GitHub 路径）
- 插件索引：未投稿 awesome-dsh-plugin
- 版本线：v0.1.0（首个版本）
- 源码规模：`src/` 2 文件 168 行，`tests/` 2 文件 18 条断言
- 已知状态：契约点 `systemPrompt.context()` 目前是**裸调用**（无运行时探测）；0.1.2+ 只有静态验证，没有运行时验证
- 设计上的"不"：不加载 `dsh-time-context`、不产生会话消息、不改系统提示词、不做面板开关、零运行时依赖

---

## 1. 项目目录

```
dsh-date-wrapper/
├── package.json              # name/type:module/main/exports["."]/dsh.bundle.patch/files；零 dependencies
├── cordis.patch.yml          # bundle patch：一行 insert（id: date-wrapper, name: dsh-date-wrapper）
├── eslint.config.mjs         # ESLint 10 扁平配置（@eslint/js recommended + 收紧项）
├── src/
│   ├── index.js              # host 半：apply() 只做校验 + 注册，49 行
│   └── format.js             # 纯函数层：时区解析/日期渲染/文本 provider/配置校验，119 行
├── tests/
│   ├── format.test.mjs       # 11 条：纯函数（时区投影、星期、格式与长度、降级、配置校验）
│   └── context.test.mjs      # 7 条：伪 ctx 断言注册契约
├── docs/
│   └── dsh-session-and-context-mechanics.md   # 会话/JSONL/请求组装机制（中文，18 KB）
├── README.{md,zh,ja,ko}      # 四语说明
├── INSTALL.{md,zh,ja,ko}     # 四语安装指南
├── CHANGELOG.{md,ja,ko}      # 三语版本记录
├── HANDOVER.md               # 本文件（中文）
└── LICENSE                   # MIT
```

外部相关位置：

- 计划产物：`E:\test\rewrite-agently\.agents\plans\dsh-date-wrapper\`（spec / findings / checklist / tasks）
- 本机安装位置：`C:\Users\joshua\.dsh\profiles\web\node_modules\<包名>\`
- profile 装配：`C:\Users\joshua\.dsh\profiles\web\package.json` 的 `dependencies` + `dsh.profile.bundles`
- 用户 patch 层：`C:\Users\joshua\.dsh\profiles\web\cordis.patch.yml`（顶层 YAML 数组）

---

## 2. DSH 契约点

| 类别 | 契约 | 值 / 位置 |
|---|---|---|
| 服务 | `systemPrompt` | `ctx.inject(['systemPrompt'], (scope) => …)` 建立子 fiber |
| API | `systemPrompt.context({ name, order, text })` | 返回**就是** Cordis effect disposer（`dsh-system-prompt:198`） |
| 条目名 | `date-wrapper:date` | 同名重复注册会抛错 |
| 排序位 | `order: 116` | 已占用：110 `sandbox:policy`、115 `approval:policy`、120 `subagent:delegation` |
| 文本 | `text: string \| ((ctx) => string)` | 我们传函数 → 每次组装取当下日期 |
| 平台消费 | `RuntimeContextProjection.project()` 按文本去重 + `surfaceOp: 'append'` | 同一天 0 条额外事件；跨天追加一条新快照 |
| 请求头 | `headerEquals` 比较 config + 全量 `system` + 全量 tool schema | 动 `system` 会失效整段前缀缓存 → 所以**不能**用 section/variable 注入 |
| preset 开关 | `includeRuntimeContext` / `suppressRuntimeContext` | 设 `false` 的 fixed-prompt preset 会丢弃 `contexts` |
| 装配 | `package.json` 的 `dsh.bundle.patch` → `cordis.patch.yml` 顶层数组 | `insert` 不带 patch 级 `id` → 落在 profile 根（宿主面） |
| **未使用** | settings / slots / DOM / CSS token / locales 四语字典 | 本插件没有 client 半，界面上没有属于它的控件 |

契约稳定性（静态比对，`npm pack` 解包后对比 `lib/types/index.d.ts` 与 `lib/index.js`）：`0.1.0-rc.7` / `0.1.1-rc.2` / `0.1.2-rc.1` / `0.1.3-alpha.2` 四个版本的 `context()` 签名与实现**逐字一致**，`PromptContext` 恒为 `{name, order, text}`（**没有** `complete` 字段）。

---

## 3. 代码结构速查（以 v0.1.0 行号为参考）

| 文件 / 区域 | 内容 |
|---|---|
| `src/index.js` ~1-17 | 模块注释：为什么用运行上下文而不是消息、为什么不用插件级 `inject` |
| `src/index.js` ~20-30 | `name` / `CONTEXT_NAME` / `CONTEXT_ORDER` 常量 |
| `src/index.js` ~39-49 | `apply(ctx, config)`：`validateConfig` → `resolveZone` → `ctx.inject` → `systemPrompt.context` |
| `src/format.js` ~22-31 | `WEEKDAY_NAMES`（固定英文表，索引同 `getUTCDay()`） |
| `src/format.js` ~37 | `TEXT_LABEL = 'Current date: '`（想改文案只改这一处） |
| `src/format.js` ~46-63 | `resolveZone`：建 `Intl.DateTimeFormat`，用 `resolvedOptions().timeZone` 规范化时区名；失败抛错 |
| `src/format.js` ~73-80 | `renderDate`：`formatToParts` → Y/M/D，再 `Date.UTC(y,m-1,d).getUTCDay()` 求星期 |
| `src/format.js` ~93-101 | `createDateContextText`：返回 provider 闭包，每次调用 `Date.now()`；渲染失败返回 `''` |
| `src/format.js` ~110-119 | `validateConfig`：只认 `timeZone`（去空白），其余键忽略；非法值抛错 |
| `tests/context.test.mjs` ~19-49 | `makeCtx()` 伪 ctx：只实现 `inject(deps, cb)`，记录注册的条目 |

---

## 4. 重要设计原则（含历史教训）

1. **注入点必须是运行上下文，不是消息**
   - 理由：快照按文本去重 + 追加，同一天 0 条额外事件；每条消息事件 339 B 且每轮都写。
   - 历史教训：第一版照抄 `dsh-time-context` 在 `agent/pre-step` 追加 `user/message`，实测 10 轮多出 ≈3.4 KB（findings D11 取代 D4/D5/D6）。

2. **不改系统提示词的 section / variable**
   - 理由：`headerEquals` 比较 `system`，日期一变就改写请求头，整段前缀缓存失效。
   - 这是被明确否决的方案 C。

3. **不加载也不过滤 `dsh-time-context`**
   - 理由：Cordis 的 `prepend` 用 `unshift`，子 fiber 异步注册的监听器会跑到 wrapper 外侧，verbose 文本既看不到也删不掉（findings D1）。
   - 结论：自包含 wrapper，绝不"包装"那个插件。

4. **不导出插件级 `inject`**
   - 理由：插件级 `inject` 会把 fiber 卡在 PENDING → 启动审计失败；`ctx.inject` 的等待语义等价，但服务缺失时只是不注册（findings D6）。
   - 测试里有一条断言专门守这个：`'inject' in pluginModule === false`。

5. **不设 `complete`**
   - 理由：设了会顶掉整份系统提示词；`PromptContext` 结构里本来也没有该字段，但断言仍在。

6. **文本 provider fail-soft，配置校验 fail-fast**
   - provider 抛错会让**每一次请求**都失败 → 渲染失败返回 `''`（平台会过滤空文本）。
   - 时区写错是配置错误 → 宁可启动失败，也不静默按 UTC 给出错误日期（findings D7）。

7. **星期必须与日期同源**
   - 跨时区边界时，北京 2026-09-08 00:30 是 Tuesday，而 UTC 同一刻还是 09-07 Monday。
   - 做法：两者都从同一份 `formatToParts` 结果推出。

8. **零 DSH import、零运行时依赖**
   - 对齐 `improve-dsh-plugins/DSH-PLUGIN-COMPATIBILITY-GUIDE.md` 的核心原则：不 `import` 任何 DSH 内部包，DSH 升级不会因导出符号变化而炸。

9. **不做面板开关**（用户决策，findings D10）
   - 开关 = 插件行是否激活；DSH「设置 → 插件」页已只读显示启用状态。
   - 本插件不导出 schemastery `Config`，所以配置不走宿主 schema 校验，校验全在 `validateConfig()` 里。

10. **版本节奏**
    - 0.1.x：文档、兼容性修补、契约点探测。
    - 0.2.0：再考虑新功能（时分秒 / 自动跟随浏览器时区都属于会破坏去重优势的改动，需重新论证）。

---

## 5. 开发 / 发布流程

### 开发

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
npm install                 # 只装 devDependencies
npm run tdd                 # 监听模式
npm run verify              # lint + 18 条断言，提交前必跑
```

link 模式安装（改源码立即生效，无需重装）：

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

### 发布（GitHub；npm 未启用）

1. `npm run verify` 全绿。
2. 同步更新 `README.{md,zh,ja,ko}` / `INSTALL.{md,zh,ja,ko}` / `CHANGELOG.{md,ja,ko}` + `package.json` 版本号（版本号必须与 CHANGELOG 首条一致）。
3. `git add -A` → `git commit` → `git push origin main`。
4. `git tag -a vX.Y.Z -m …` → `git push origin vX.Y.Z`。
5. `gh release create vX.Y.Z --title … --notes …`。
6. 若将来发 npm：`npm publish --access public` ← ⚠️ 必须带 `--access public`，然后 `npm view` 验证（注册表传播 2-3 分钟）。

⚠️ `package.json` 的 `files` 白名单必须收录所有新增文档，否则 tarball 里缺文件（`npm pack --dry-run` 自查）。
⚠️ bundle patch **不热重载**：改 `cordis.patch.yml` 或换版本后必须重启 `dsh web`。

---

## 6. 测试速查

- 全量：`npm test`（`node --test "tests/*.test.mjs"`）。
- 单文件：`node tests/format.test.mjs`（受限沙箱下最稳 —— 多文件模式会派生子进程，可能 `spawn EPERM`）。
- TDD：`npm run tdd`（`node --test --watch`）。
- 目前 18 条：`format.test.mjs` 11 条、`context.test.mjs` 7 条。

改动注入逻辑时的回归清单：

1. 日期不变 → 平台不追加新快照（同一天 0 条事件）。
2. 跨天 → 追加一条新快照，旧快照保留，最新一条靠 supersedes 声明生效。
3. 非法 `timeZone` → `apply` 抛错且**不注册**任何条目。
4. 渲染失败 → provider 返回 `''`，不抛错。
5. 跨时区边界 → 星期与日期不错位（`2026-09-07T16:30:00Z` → 北京 Tuesday / UTC Monday）。
6. fixed-prompt preset（`includeRuntimeContext: false`）→ 条目被丢弃，属预期。

目检清单：

- 新会话发一句话 → 运行上下文快照里出现 `Current date: …`（来源含 `system-prompt`）。
- profile patch 置 `disabled: true` → 后续会话不再出现该行（热生效）。
- `timeZone: UTC` 重启 → 日期按 UTC。
- 搜索会话日志 → 没有 `Time sampled` / `Elapsed since` / `Browser time zone`。

---

## 7. 待办 / 路线图

- **P0 契约点运行时探测**：给 `scope.systemPrompt.context` 加 `typeof` 检查 + `ctx.logger.warn` 降级，让 API 改名表现为"静默不注入"而不是"插件加载失败"（对齐兼容指南 §二）。
- **P1 运行时跨版本验证**：在 0.1.2-rc.1 / 0.1.3-alpha.2 各跑一次真实会话（目前只有静态比对）。
- **P2 面向社区发布**：npm publish、`.github/ISSUE_TEMPLATE`、投稿 awesome-dsh-plugin。
- **已否决**：设置面板开关（用户决策）；用 section/variable 注入（前缀缓存）；`prepend` 过滤 `dsh-time-context`（findings D1）。
- **未做且需重新论证**：时分秒粒度；自动跟随浏览器时区（两者都会让日期行每次请求都变化，从而破坏"按文本去重"的收益）。

---

## 8. 社区与 issue 现状

- 仓库：public，`main` 分支，首个提交 `8fe1713`。
- issue / PR：0。
- 贡献者：drscrewdriver。
- 未投稿 awesome-dsh-plugin；无 GitHub Actions / CI。

---

## 9. 计划产物与决策记录

> 以下四项在**本机工作区**（`E:\test\rewrite-agently\.agents\plans\`），**不在仓库里**，随工作区而非随包分发。

- `.agents/plans/dsh-date-wrapper/spec.md` — 需求、技术方案、决策记录、约束。
- `.agents/plans/dsh-date-wrapper/findings.md` — D1–D13：架构决策（D1 自包含、D2 bundle patch、D6 不声明 inject、D7 fail-fast、D10 开关语义、D11 注入点改运行上下文、D12 注册契约、D13 输出格式）+ 打包/工具链契约 + 风险。
- `.agents/plans/dsh-date-wrapper/checklist.md` — M1–M19 必过项、S1–S6 应过项、Non-Goals、未验证项（诚实声明）。
- `.agents/plans/dsh-date-wrapper/tasks.md` — Phase 0–6 与里程日志。

> 交接提示：`findings.md` 的 D11 与 `docs/dsh-session-and-context-mechanics.md` 是理解"为什么不用消息、不改系统提示词"的关键两处；只读 README 容易以为只是省 token，实际约束是**前缀缓存**与**日志重建不变量**。
