/**
 * src/index.js 单测：用伪 ctx 断言运行上下文的注册契约。
 *
 * 伪 ctx 只实现 `inject(deps, callback)`，并把 `systemPrompt.context(...)` 的
 * 入参记录下来 —— 以此验证插件只通过平台公开接口注册、不自造消息、不设
 * `complete`、且注册归属 Cordis 生命周期。
 */
import * as pluginModule from '../src/index.js'
import {
  CONTEXT_NAME,
  CONTEXT_ORDER,
  apply,
  name,
} from '../src/index.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'

/** 伪 Cordis ctx：记录 inject 的依赖与回调，并捕获注册的 context 条目。 */
function makeCtx() {
  const calls = { inject: [], sections: [], disposers: [] }
  const ctx = {
    inject(deps, callback) {
      calls.inject.push({ deps, callback })
      const scope = {
        systemPrompt: {
          context(section) {
            calls.sections.push(section)
            const dispose = () => {}
            calls.disposers.push(dispose)
            return dispose
          },
        },
      }
      callback(scope)
      return { dispose: () => {} }
    },
  }
  return { ctx, calls }
}

/** 挂载插件并返回注册记录。 */
function mount(config) {
  const { ctx, calls } = makeCtx()
  apply(ctx, config)
  assert.equal(calls.inject.length, 1, '只应调用一次 ctx.inject')
  assert.deepEqual(calls.inject[0].deps, ['systemPrompt'], '依赖必须是 systemPrompt')
  assert.equal(calls.sections.length, 1, '只应注册一个运行上下文条目')
  return { calls, section: calls.sections[0] }
}

test('插件身份：只导出 name，不导出插件级 inject', () => {
  assert.equal(name, 'date-wrapper')
  assert.equal('inject' in pluginModule, false, '插件级 inject 会把 fiber 卡在 PENDING 并让启动审计失败')
})

test('注册参数：name / order / text 为函数', () => {
  const { section } = mount({ timeZone: 'Asia/Shanghai' })
  assert.equal(section.name, CONTEXT_NAME)
  assert.equal(section.name, 'date-wrapper:date')
  assert.equal(section.order, CONTEXT_ORDER)
  assert.equal(section.order, 116)
  assert.equal(typeof section.text, 'function', 'text 必须是函数，平台每次组装都会调用')
})

test('绝不能设 complete（否则会顶掉整份系统提示词）', () => {
  const { section } = mount({ timeZone: 'Asia/Shanghai' })
  assert.equal('complete' in section, false)
})

test('text 返回 <label> <date> <zone> <weekday>，且随调用重新取值', () => {
  const { section } = mount({ timeZone: 'Asia/Shanghai' })
  const first = section.text()
  assert.match(first, /^Current date: \d{4}-\d{2}-\d{2} Asia\/Shanghai [A-Z][a-z]+day$/)
  assert.ok(first.length <= 50)
  assert.equal(section.text(), first)
})

test('时区名原样出现在文本里（UTC 与 Asia/Shanghai 各一例）', () => {
  const sh = mount({ timeZone: 'Asia/Shanghai' })
  const utc = mount({ timeZone: 'UTC' })
  assert.match(sh.section.text(), / Asia\/Shanghai /)
  assert.match(utc.section.text(), / UTC /)
})

test('两次挂载互不影响（无模块级状态）', () => {
  const a = mount({ timeZone: 'Asia/Shanghai' })
  const b = mount({ timeZone: 'UTC' })
  assert.match(a.section.text(), / Asia\/Shanghai /)
  assert.match(b.section.text(), / UTC /)
})

test('非法配置在 apply 阶段抛错，且不注册任何条目', () => {
  assert.throws(() => mount({ timeZone: 'Not/AZone' }), /date-wrapper: 非法 IANA timeZone/)
  assert.throws(() => mount({ timeZone: '' }), /config\.timeZone/)
})
