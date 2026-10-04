/**
 * 跨天语义（矩阵 §4.2-3 的格内快速形态）。
 *
 * 宿主 `RuntimeContextProjection.project()` 按文本去重、追加式：同文本不落新
 * 事件，文本变化才追加一条新快照。本文件用显式时间戳驱动 `renderDate`，建模
 * 该语义：一天内任意多次请求 0 条新事件，跨天恰好 1 条。不 mock 全局时钟 ——
 * `renderDate(now, …)` 本就接收时间戳，投影模型用纯函数重建。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createDateContextText, renderDate, resolveZone } from '../src/format.js'

/** 宿主投影的最小模型：retained 文本相同 → 不追加；变化 → 追加一条。 */
function makeProjection() {
  let retained = null
  return {
    /** @returns 追加的新快照条数（0 或 1）。 */
    project(text) {
      if (retained === text) return 0
      retained = text
      return 1
    },
    get retained() {
      return retained
    },
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

test('同一天内任意多请求：同文本不落新事件（0 条追加）', () => {
  const { formatter, zone } = resolveZone('Asia/Shanghai')
  const projection = makeProjection()
  // 2026-03-08 00:00:00.100 起步，步进 5 分钟 × 200 次 ≈ 16.7 小时，不出当天。
  // 首条快照本就落一条（retained 从 null 起步），先打底再断言后续全为 0。
  let now = Date.UTC(2026, 2, 8, 0, 0, 0, 100) - 8 * 60 * 60 * 1000
  assert.equal(projection.project(renderDate(now, formatter, zone)), 1, '首条快照落一条')
  for (let i = 0; i < 200; i += 1) {
    assert.equal(projection.project(renderDate(now, formatter, zone)), 0, `第 ${i} 次请求不应追加`)
    now += 5 * 60 * 1000
  }
})

test('跨天瞬间：恰好追加一条新快照，日期与星期同步进位', () => {
  const { formatter, zone } = resolveZone('Asia/Shanghai')
  const projection = makeProjection()
  // 2026-03-08 23:59:59.900（上海）→ 2026-03-09 00:00:00.100
  const before = Date.UTC(2026, 2, 8, 15, 59, 59, 900)
  const after = before + 200
  assert.equal(projection.project(renderDate(before, formatter, zone)), 1)
  assert.match(renderDate(before, formatter, zone), /Current date: 2026-03-08 Asia\/Shanghai \w+$/)
  const appended = projection.project(renderDate(after, formatter, zone))
  assert.equal(appended, 1, '跨天必须恰好一条')
  assert.match(renderDate(after, formatter, zone), /Current date: 2026-03-09 Asia\/Shanghai \w+$/)
  assert.equal(projection.project(renderDate(after + 1, formatter, zone)), 0, '新的一天内继续去重')
})

test('月末/年末跨天：进位不串位（3月1日前夜 → 2月28日 → 3月1日）', () => {
  const { formatter, zone } = resolveZone('UTC')
  const projection = makeProjection()
  // 2026-02-28 → 2026-03-01（2026 非闰年）
  const feb28 = Date.UTC(2026, 1, 28, 12)
  assert.equal(projection.project(renderDate(feb28, formatter, zone)), 1)
  assert.match(renderDate(feb28 + DAY_MS, formatter, zone), /Current date: 2026-03-01 UTC \w+$/)
  assert.equal(projection.project(renderDate(feb28 + DAY_MS, formatter, zone)), 1)
  assert.equal(projection.project(renderDate(feb28 + 2 * DAY_MS, formatter, zone)), 1)
  assert.match(renderDate(feb28 + 2 * DAY_MS, formatter, zone), /2026-03-02/)
})

test('provider 形态：createDateContextText 每次取当下（与投影模型闭环）', () => {
  const { formatter, zone } = resolveZone('Asia/Shanghai')
  const provider = createDateContextText({ formatter, zone })
  const text = provider()
  assert.match(text, /^Current date: \d{4}-\d{2}-\d{2} Asia\/Shanghai (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/)
})
