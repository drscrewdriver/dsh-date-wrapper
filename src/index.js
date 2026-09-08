/**
 * dsh-date-wrapper — host 半。
 *
 * 把当前日期注册为一条**动态运行上下文**（`systemPrompt.context`）。平台在每次
 * 组装 prompt 时渲染它，并把它并入自己那条「Current runtime context」快照消息，
 * 文本形如 `2026-09-08 Asia/Shanghai Tuesday`：
 *
 * - 不产生额外的 `user/message`（对比：往 `agent/pre-step` 塞消息会每轮落一条）；
 * - 平台对快照**按文本去重**（`RuntimeContextProjection.project()` 只在文本变化时
 *   追加新快照），所以日期不变时一条事件都不多，跨天时最多多一条；
 * - 快照是**追加**而非原地改写，请求序列只增长，因此不破坏前缀缓存。
 *
 * 生命周期：`ctx.inject(['systemPrompt'], …)` 建立子 fiber，注册随插件 fiber
 * 一起回收。**不导出插件级 `inject`** —— 那会让 fiber 卡在 PENDING，服务缺失时
 * 触发启动审计失败；`ctx.inject` 的等待语义相同但不拖垮 boot（先例：
 * `@deepseek-ai/dsh-user-approval`）。
 */
import { createDateContextText, resolveZone, validateConfig } from './format.js'

/** Cordis 插件名。 */
export const name = 'date-wrapper'

/** 运行上下文条目的名字（同名重复注册会抛错）。 */
export const CONTEXT_NAME = 'date-wrapper:date'

/**
 * 排序位。上下文按 order 升序渲染（`dsh-system-prompt:276`）；
 * 已占用：110 sandbox:policy、115 approval:policy、120 subagent:delegation。
 */
export const CONTEXT_ORDER = 116

/**
 * 注册日期运行上下文。
 *
 * @param {object} ctx Cordis 上下文。
 * @param {{ timeZone?: string }} [config] patch 行下发的配置。
 * @throws {Error} `timeZone` 非法时抛错（fail-fast，绝不静默降级成 UTC）。
 */
export function apply(ctx, config) {
  const { timeZone } = validateConfig(config)
  const { formatter, zone } = resolveZone(timeZone)
  ctx.inject(['systemPrompt'], (scope) => {
    scope.systemPrompt.context({
      name: CONTEXT_NAME,
      order: CONTEXT_ORDER,
      text: createDateContextText({ formatter, zone }),
    })
  })
}
