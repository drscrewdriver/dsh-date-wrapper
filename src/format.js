/**
 * dsh-date-wrapper — 时区投影与日期文本（纯函数，零依赖，可单测）。
 *
 * 输出格式：`Current date: 2026-09-08 Asia/Shanghai Tuesday`
 * —— 标签 + ISO 日期 + IANA 时区名 + 英文星期，无时分秒。
 * 标签与快照里其它条目的风格一致（`Current DSH file policy: …`、`Approval policy: …`）。
 *
 * 设计要点：
 * - 日期与星期都从**同一份投影结果**推出：先用 `formatToParts` 得到该时区的
 *   Y/M/D，再由 `Date.UTC(y, m-1, d).getUTCDay()` 求星期。这样星期不可能与
 *   日期错位（跨时区边界时，北京 2026-09-08 00:30 必须是 Tuesday，而 UTC
 *   同一时刻还是 2026-09-07 Monday）。
 * - 不依赖 locale 数据：星期用固定英文表，日期手工拼串（`en-CA` 恰好也给
 *   `YYYY-MM-DD`，但那是巧合而非契约）。
 * - 只产出**文本**：注入点是 `systemPrompt.context()`（动态运行上下文），由平台
 *   把它并入「Current runtime context」快照消息 —— 不产生额外的 user/message，
 *   也不改写系统提示词（见 README）。
 * - 文本 provider 必须 fail-soft：prompt 组装期抛错会让**每一次请求**都失败，
 *   所以无法渲染时返回空串（平台会过滤掉空文本，见 dsh-system-prompt:102）。
 */

/** 星期名（索引同 `getUTCDay()`：0=Sunday）。固定英文表，不依赖 locale。 */
const WEEKDAY_NAMES = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
])

/**
 * 文本标签。与快照里其它条目的风格一致（`Current DSH file policy: …`）。
 * 想换成 `Date:` / `Date refer:` 只改这一处。
 */
export const TEXT_LABEL = 'Current date: '

/**
 * 解析并校验时区，产出一个可复用的格式化器。
 *
 * @param {string|undefined} timeZone IANA 时区名；`undefined` 表示用进程时区。
 * @returns {{ formatter: Intl.DateTimeFormat, zone: string }} 格式化器与规范化时区名。
 * @throws {Error} 时区非法或无法解析时抛错（fail-fast，绝不静默降级成 UTC）。
 */
export function resolveZone(timeZone) {
  let formatter
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      ...(timeZone === undefined ? {} : { timeZone }),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch (error) {
    const reason =
      timeZone === undefined
        ? '系统时区无法解析'
        : `非法 IANA timeZone ${JSON.stringify(timeZone)}`
    throw new Error(`date-wrapper: ${reason}`, { cause: error })
  }
  return { formatter, zone: formatter.resolvedOptions().timeZone }
}

/**
 * 渲染一行日期文本。
 *
 * @param {number} now 时间戳（毫秒）。
 * @param {Intl.DateTimeFormat} formatter 由 {@link resolveZone} 产出。
 * @param {string} zone 规范化 IANA 时区名，原样出现在文本里。
 * @returns {string} 形如 `Current date: 2026-09-08 Asia/Shanghai Tuesday`。
 */
export function renderDate(now, formatter, zone) {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(now)).map((part) => [part.type, part.value]),
  )
  const date = `${parts.year}-${parts.month}-${parts.day}`
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()]
  return `${TEXT_LABEL}${date} ${zone} ${weekday}`
}

/**
 * 构造运行上下文条目的文本 provider。
 *
 * 平台每次组装 prompt 都会调用它（`dsh-system-prompt:271`），所以日期始终是
 * 当次请求的当下日期。渲染失败时返回空串而不是抛出 —— prompt 组装期抛错会
 * 让每一次请求都失败，而日期缺失只是可接受的降级；空文本会被平台过滤掉
 * （`dsh-system-prompt:102`）。
 *
 * @param {{ formatter: Intl.DateTimeFormat, zone: string }} deps 渲染依赖。
 * @returns {() => string} 每次调用重新取当前时间的文本 provider。
 */
export function createDateContextText({ formatter, zone }) {
  return () => {
    try {
      return renderDate(Date.now(), formatter, zone)
    } catch {
      return ''
    }
  }
}

/**
 * 校验并规范化插件配置。
 *
 * @param {unknown} config 来自 `cordis.patch.yml` 的行配置。
 * @returns {{ timeZone: string|undefined }} 去空白后的配置。
 * @throws {Error} `timeZone` 类型或取值非法时抛错。
 */
export function validateConfig(config) {
  const raw = config && typeof config === 'object' && !Array.isArray(config) ? config : {}
  const { timeZone } = raw
  if (timeZone !== undefined && (typeof timeZone !== 'string' || timeZone.trim() === '')) {
    throw new Error(
      `date-wrapper: config.timeZone must be a non-empty IANA zone string, got ${JSON.stringify(timeZone)}`,
    )
  }
  return { timeZone: timeZone === undefined ? undefined : timeZone.trim() }
}
