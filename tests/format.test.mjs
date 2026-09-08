/**
 * src/format.js 单测：时区投影、星期、格式、provider 的降级、配置校验。
 *
 * 时区边界的样例时刻经过挑选，能在「裸 UTC 取日」的实现上失败：
 * - 2026-09-07T16:30:00Z → 北京已是 09-08 Tuesday（UTC 还是 09-07 Monday）
 * - 2026-09-08T16:30:00Z → 北京已是 09-09 Wednesday
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TEXT_LABEL,
  createDateContextText,
  renderDate,
  resolveZone,
  validateConfig,
} from '../src/format.js'

const SH = resolveZone('Asia/Shanghai')
const UTC = resolveZone('UTC')

test('TEXT_LABEL：与快照其它条目同风格', () => {
  assert.equal(TEXT_LABEL, 'Current date: ')
})

test('resolveZone：解析并规范化时区名', () => {
  assert.equal(SH.zone, 'Asia/Shanghai')
  assert.equal(UTC.zone, 'UTC')
})

test('resolveZone：非法时区 fail-fast', () => {
  assert.throws(() => resolveZone('Not/AZone'), /^Error: date-wrapper: 非法 IANA timeZone/)
})

test('resolveZone：缺省用进程时区', () => {
  const auto = resolveZone(undefined)
  assert.equal(typeof auto.zone, 'string')
  assert.notEqual(auto.zone, '')
})

test('renderDate：格式为 <label> <date> <zone> <weekday>', () => {
  assert.equal(
    renderDate(Date.parse('2026-09-08T08:05:36Z'), SH.formatter, SH.zone),
    'Current date: 2026-09-08 Asia/Shanghai Tuesday',
  )
  assert.equal(
    renderDate(Date.parse('2026-09-08T08:05:36Z'), UTC.formatter, UTC.zone),
    'Current date: 2026-09-08 UTC Tuesday',
  )
})

test('renderDate：跨时区边界日期与星期同步不串位', () => {
  // 北京 09-08 00:30（Tuesday） vs UTC 09-07 16:30（Monday）
  assert.equal(
    renderDate(Date.parse('2026-09-07T16:30:00Z'), SH.formatter, SH.zone),
    'Current date: 2026-09-08 Asia/Shanghai Tuesday',
  )
  assert.equal(
    renderDate(Date.parse('2026-09-07T16:30:00Z'), UTC.formatter, UTC.zone),
    'Current date: 2026-09-07 UTC Monday',
  )
  // 北京 09-09 00:30（Wednesday）
  assert.equal(
    renderDate(Date.parse('2026-09-08T16:30:00Z'), SH.formatter, SH.zone),
    'Current date: 2026-09-09 Asia/Shanghai Wednesday',
  )
})

test('renderDate：七个星期名都能正确取到', () => {
  const week = [
    ['2026-09-06T12:00:00Z', 'Sunday'],
    ['2026-09-07T12:00:00Z', 'Monday'],
    ['2026-09-08T12:00:00Z', 'Tuesday'],
    ['2026-09-09T12:00:00Z', 'Wednesday'],
    ['2026-09-10T12:00:00Z', 'Thursday'],
    ['2026-09-11T12:00:00Z', 'Friday'],
    ['2026-09-12T12:00:00Z', 'Saturday'],
  ]
  for (const [iso, name] of week) {
    assert.equal(
      renderDate(Date.parse(iso), UTC.formatter, UTC.zone),
      `Current date: 2026-09-${iso.slice(8, 10)} UTC ${name}`,
    )
  }
})

test('renderDate：长度与 verbose 片段检查', () => {
  const text = renderDate(Date.parse('2026-09-08T08:05:36Z'), SH.formatter, SH.zone)
  assert.equal(text.length, 46)
  assert.ok(text.length <= 50)
  assert.equal(Math.ceil(text.length / 4), 12, '按 DSH 的 CHARS_PER_TOKEN=4 启发式约 12 token')
  for (const forbidden of ['Time sampled', 'Elapsed since', 'Browser time zone', '当前日期']) {
    assert.ok(!text.includes(forbidden))
  }
})

test('createDateContextText：每次调用取当下日期', () => {
  const provider = createDateContextText({ formatter: SH.formatter, zone: SH.zone })
  const before = provider()
  assert.match(
    before,
    /^Current date: \d{4}-\d{2}-\d{2} Asia\/Shanghai (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/,
  )
  assert.equal(provider(), before, '同一天内两次调用应一致')
})

test('createDateContextText：渲染失败降级为空串（不得让 prompt 组装抛错）', () => {
  const broken = { formatToParts() { throw new Error('boom') } }
  const provider = createDateContextText({ formatter: broken, zone: 'Asia/Shanghai' })
  assert.equal(provider(), '')
})

test('validateConfig：缺省、去空白、非法值', () => {
  assert.deepEqual(validateConfig(undefined), { timeZone: undefined })
  assert.deepEqual(validateConfig({ timeZone: '  Asia/Shanghai ' }), { timeZone: 'Asia/Shanghai' })
  assert.deepEqual(validateConfig('nope'), { timeZone: undefined })
  assert.deepEqual(validateConfig({ label: '北京时间' }), { timeZone: undefined }, 'label 已移除，未知键被忽略')
  assert.throws(() => validateConfig({ timeZone: '' }), /config\.timeZone/)
  assert.throws(() => validateConfig({ timeZone: 42 }), /config\.timeZone/)
})
