# DSH 会话、JSONL 与请求组装机制

> 本文档描述 DeepSeek Harness 的**会话事件日志 ⇄ JSONL 持久化**、**surface 派生**、**请求组装**与**运行上下文快照的取代机制**。
> 所有结论都带 `文件:行号` 依据，路径以本机安装为基准：
> `[DSH]` = `C:\nvm\v22.22.1\node_modules\@deepseek-ai\dsh\`，`[PKG]` = `[DSH]node_modules\@deepseek-ai\`。
> 实测数据来自一个真实会话（373 步 / 822 个 surface 事件 / 2.1 MB 压缩日志），见 §8。

---

## 0. 一页速览

```
用户输入 / steering
      │
      ▼
  inbox（两个列表：next-step / next-turn）
      │  claim(target, turn)  →  本次请求的「claimed 批次」
      ▼
agent/pre-step  waterfall（13 个监听器，8 个会改批次）
      │  默认决策在最内层追加 runtime-context 快照
      ▼
decision.messages  ← 这一步要落盘的 user/message 们
      │  session.append(..., { surfaceOp:'append' })
      ▼
会话事件日志（唯一真相，append-only）
      │                         │
      │ surfaceOp: append       │ surfaceOp: replace{start,end}  ← 只遮蔽「表面」，不删日志
      ▼                         ▼
   surface（模型可见消息序列）
      │  deriveMessages()
      ▼
 buildRequest(turn, step, tools, system, deriveMessages(), signal)
      │
      ├── request/header  ← 仅在 system/tools/config 变化时追加（含整份 system + 工具 schema）
      ├── request/context ← 仅在 provider/model/contextWindow 变化时追加
      ▼
 deepFreeze(request) + markAgentLoopRequest(request)
      │
      ▼
 llm/stream waterfall → adapter
      │  （只允许包流；agent-loop invariant 断言 messages 必须等于 deriveMessages()）
      ▼
 模型
      │
      ▼
 assistant/message + tool/call + tool/result → 再次 session.append
```

---

## 1. 会话事件日志：唯一真相

### 1.1 事件形状

```js
{ type, seq, time, data, ...surfaceMetadata }   // surfaceMetadata = { surfaceOp?, sourceEventSeqs? }
```

`session.append()` 做三件事（`[PKG]dsh-session/lib/types/index.js:484-509`）：

1. `snapshotJsonValue(data)` —— 必须**无损 JSON 序列化**（不能有 `undefined`、函数、`Date`、循环、非有限数）；
2. `assertSupportedRequestHeader()` —— 拒绝已废弃的历史格式；
3. `deepFreeze({ type, seq, time, data, ... })` —— **日志自己深冻结快照**，调用方不需要预冻结，也不会被后续别名修改。

> 日志是 durable source of truth：坏事件在 `append` 处就失败，而不是等到刷盘时（`:478-483` 的注释）。

### 1.2 主要事件类型（本会话实测计数）

| 事件 | 说明 | 本会话 |
|---|---|---|
| `turn/start` · `turn/end` | 轮次边界 | 10 / 9 |
| `step/start` · `step/end` | 步骤边界（= 一次模型调用） | 231 / 230 |
| `user/message` | 用户输入 + 所有注入上下文 | 20 |
| `assistant/message` | 模型回复 | 231 |
| `assistant/chunk` / `text-chunks` / `reasoning-chunks` / `tool-call-chunks` | 流式增量（后三者是 `packChunks` 打包行） | 1756 / 164 / 1202 / 851 |
| `tool/call` · `tool/result` | 工具调用与结果 | 275 / 274 |
| `request/header` | 请求头（system + tools + config）变化 | 1 |
| `request/context` | provider/model/contextWindow 变化 | 1 |
| `agent/inbox/spliced` | 入队/出队审计 | 27 |

### 1.3 落盘路径

`session.append` 后，持久化层把事件批量写成 JSONL：

- 目录：`<sessionRoot>/<project>/<session-id>/`（`[PKG]dsh-session-persistence-jsonl/lib/index.js:145-157`）；
- 文件：`session.jsonl`（`compression: none`）或 `session.jsonl.zstd`（默认）。

---

## 2. 会话 ⇄ JSONL 的转换

### 2.1 物理布局：header 帧 + N 个批次帧

```
session.jsonl.zstd
├── [zstd frame #1]  首行 header（JSON）           ← encodeMaterialization
├── [zstd frame #2]  首批事件行                    ← encodeMaterialization
├── [zstd frame #3]  一次 append 批次的事件行      ← encodeEventBatch
├── ...
└── [zstd frame #N]  ...
```

- `encodeMaterialization()`（`:1170-1178`）：header 行与首批事件**分成两个独立 zstd 帧**，刻意不合并帧边界；
- `encodeEventBatch()`（`:1179-1183`）：每次持久化 append = 一批事件 → `eventLines() + "\n"` → 一个 zstd 帧；
- 所以一个长会话是**多帧 zstd 拼接**：本会话实测 **2731 个帧**（`0x28 0xB5 0x2F 0xFD` 魔数计数），普通解压只解出第一帧——需要按魔数切帧或走 DSH 自带的 `zstd-private-decoder`（`:336-383`）。

### 2.2 header 行

```js
{ type: 'session', version, id, createdAt, cwd?, parentSession?, seedLength?, origin?, delegationDepth, agentPreset? }
```
（`toHeaderLine()`，`:36-49`）—— 首行必须是合法 header，否则日志判为损坏（`:187-198`）。

### 2.3 事件行与 `packChunks`

```js
eventLines(events, packChunks) {
  return (packChunks ? packChunkRuns(events) : events).map((r) => JSON.stringify(r)).join("\n")
}
```
（`:160-172`）

- 默认 `packChunks: true`：连续的流式 delta 会被**打包成 `text-chunks` / `reasoning-chunks` / `tool-call-chunks` 存储行**，不再是一事件一行；
- 关闭时逐事件一行，与打包前的字节布局一致；读取端对布局不敏感（`scanLog` 总是先解码再读）。

### 2.4 崩溃安全

- 写入后 `fsync`；部分写或同步失败时**回滚到之前的文件长度**再抛错，因为游标未变会重试该批次，残留半行会造成重复 `seq`（`:1195-1199` 起）。

### 2.5 读回与恢复

- 解码：多帧 zstd → 逐行 JSON → 事件对象；header 行单独校验（`refuseForeignFormatVersion()` 拒绝未来格式）；
- 形状校验发生在**导入边界**：`adoptSessionEvent` / `snapshotSessionEvent` → `assertMessageEventShape()`（`[PKG]dsh-session/lib/types/index.js:219-247`）。`user/message` 要求 `id` 非空串、`role` 匹配、`source.kind` 非空串、`content` 是数组；**不检查** `source.form` / `sections`；
- 历史消息缺 `id` 时会被补铸确定性 id `legacy-message:${sessionId}:${seq}`（`[PKG]dsh-session-persistence/lib/index.js:665-678`、`:518-521`）；
- 由于日志可完整重建，**恢复 = 重放**，不需要额外快照文件。

---

## 3. Surface：从日志派生「模型可见的消息」

日志里并非每条事件都进对话。`surfaceOp` 决定可见性（`[PKG]dsh-session/lib/types/surface.js`）：

| op | 含义 |
|---|---|
| 缺失 | 不是 surface 事件（如 `step/start`、`tool/call`），不参与消息派生 |
| `'append'` | 追加到可见序列 |
| `{ op: 'replace', start, end, sourceEventSeqs? }` | **遮蔽** `[start, end]` 区间的既有可见事件；事件本身仍留在日志里 |

- surface 事件类型是固定的那几种（`user/message`、`assistant/message`、`tool/result` 等，`:12`）；
- `deriveMessages()` 增量遍历 surface 节点，产出模型可见的消息数组，并在 `replaceGeneration` 变化时重建缓存（`[PKG]dsh-session/lib/types/index.js` 的 `deriveMessages()`）；
- **`replace` 的真实使用者**：压缩检查点 —— `session.append('user/message', checkpoint, { surfaceOp: { op:'replace', start, end }, sourceEventSeqs:[…] })`（`[PKG]dsh-compaction-basic/lib/index.js:606-611`）。它把被折叠的一段历史从**表面**遮掉，日志里一条不删。

> 这就是「日志 ≠ 对话」的分界线：日志只追加，对话靠 `surfaceOp` 重新投影。

---

## 4. 请求组装（`buildRequest`）

每次 step 前，`[PKG]dsh-agent-loop/lib/index.js:693-762` 组装三块：

| 块 | 来源 | 变化时记录 |
|---|---|---|
| `system` | `renderPrompt(assembly)` 把 sections 用 `\n\n` 拼起来（`[PKG]dsh-system-prompt/lib/index.js:65-67`） | `request/header.system` |
| `tools` | 各 provider 提供的 schema，按 scope 收集 + `orderTools()` 排序（`[PKG]dsh-tools:2595`、`[PKG]dsh-system-prompt:280`） | `request/header.tools` |
| `messages` | `session.deriveMessages()`（即 §3 的 surface 派生） | 不单独记录（就是日志本身） |

### 4.1 `request/header`：只在变化时写

```js
const header = canonicalHeader({ config, adapterDefaults?, system?, tools? })
if (!requestHeaderLogged) append('request/header', { header, reason: 'initial' | 'resume' })
else if (!headerEquals(baseline, header)) append('request/header', { header, reason: 'change' })
```
（`:725-741`）

`headerEquals` 比较 `config`、`adapterDefaults`、**`system` 全串**、**`tools` 全量 schema**（`:548` 起）。所以：

- 系统提示词或工具表**不变**时，一条 header 都不写（本会话 373 步只有 **1 条** header：`system` 16853 字符 + **56** 个工具 schema）；
- 一旦变化，追加的是**整份** header —— 这是「改系统提示词代价高」的直接原因。

### 4.2 请求对象被冻结并打标

```js
request: markAgentLoopRequest(deepFreeze({ ...header.config, messages, system?, tools?, sessionId, signal }))
```
（`:751-761`）—— `deepFreeze` 后不可改；`markAgentLoopRequest` 把对象登记进 WeakSet（`[PKG]dsh-llm/lib/index.js:87-90`），供下游按身份识别。

### 4.3 `llm/stream` 只能包流，不能改请求

```js
streamWithRegistration(options, prepared) {
  return this.ctx.waterfall(this, 'llm/stream', options, () => this.adapterStream(options, prepared))
}
```
（`[PKG]dsh-llm/lib/index.js:1636-1641`）

`next` 是零参闭包、`options` 已冻结 → 监听器只能包装返回的流（in-box 的 `llm-invariant` 就是 `validateStream(next())`）。

### 4.4 「请求必须等于日志派生」是硬契约

`[PKG]dsh-agent-loop/lib/invariant.js:15-33` 在 `llm/stream` 上断言：

```js
if (!isAgentLoopRequest(options)) return next()
if (!Object.isFrozen(options)) fail('a loop-built request must be frozen')
const expected = session.deriveMessages()
if (JSON.stringify(options.messages) !== JSON.stringify(expected))
  fail('llm request … diverges from the dispatch-time durable derivation (log-reconstruction desync)')
if (!(options.model === header.config.model && options.system === header.system && …)) fail(…)
```

→ **任何「只发给模型、不落日志」的消息注入都会被判为违约**。想影响模型看到的 messages，只能通过日志（`agent/pre-step` 追加消息）；想影响 system，只能通过 `request/header`（即 `systemPrompt.section`）。

---

## 5. pre-step 批次：`decision.messages`

### 5.1 组装顺序

```js
const claimed = this.inbox.claim(target, position.turn)
const assembly = await this.loopCtx.systemPrompt.assemble(assembleContextFor(this, signal))
const context  = this.runtimeContext.project(joinContextSections(sections), sections)
const decision = await this.dispatch.waterfall('agent/pre-step',
  { messages: claimed, ...position, signal },
  () => Promise.resolve({ kind: 'enter', messages: context === undefined ? claimed : [...claimed, context] }))
```
（`[PKG]dsh-agent-loop/lib/index.js:492-514`）

### 5.2 `claim` 规则

```js
claim(target, turn) {
  const claimed = this.mutate('next-step', 0, this.nextStep.length, [], false)   // next-step 全部
  if (target === 'next-turn') claimed.push(...this.mutate('next-turn', 0, 1, [], false))  // 至多 1 条
  …
}
```
（`[PKG]dsh-agent/lib/types/inbox.js:50-57`）

- `next-step`：`steer()` / `inject()` 的目标，**没有条数上限**（连续插队会累积）；
- `next-turn`：`followup()` 的目标，每次 claim **最多取 1 条**；
- `turn()` 里 `target` 首步是 `'next-turn'`，之后变 `'next-step'`（`:529`、`:572`）。

### 5.3 谁在动批次

本版本 13 个 `agent/pre-step` 监听器，其中 8 个会改批次：`time-context`(append)、`tmux-context`(prepend)、`session-reference`(改写+插入)、`tool-skill`(append/replace/remove)、`agent-instructions`(插在最后一条 claimed 之后)、`tool-cordis`(append)、`plan-mode`(append)、以及运行上下文默认追加。

### 5.4 实测：大多数步骤批次是空的

| 每步 `user/message` 条数 | 步数 |
|---|---|
| 0 | 349 |
| 1 | 20 |
| 2 | 2 |
| 3 | 1 |
| 6 | 1 |

工具调用后的续跑没有新输入 → 批次为空 → `for (const m of decision.messages) session.append(...)`（`:554`）空转，但 `step/start` 照常开、模型继续。

---

## 6. 运行上下文快照与「取代」机制

### 6.1 它是「动态事实」的合并通道

四个贡献者（`systemPrompt.context({ name, order, text })`，`[PKG]dsh-system-prompt/lib/index.js:196-199`）：

| 来源 | name | order |
|---|---|---|
| `dsh-sandbox-policy` | `sandbox:policy` | 110 |
| `dsh-user-approval` | `approval:policy` | 115 |
| `dsh-date-wrapper` | `date-wrapper:date` | 116 |
| `dsh-subagent` | `subagent:delegation` | 120 |

每次 assemble 重新求值（`text` 可以是函数，`:271`），按 order 排序后用 `\n\n` 拼成一条快照文本。

### 6.2 只在文本变化时才产生消息

```js
project(current, sections) {
  if (this.retained === void 0 && current.length === 0) return
  const snapshot = current.length === 0 ? CLEARED : current
  if (this.retained?.text === snapshot) return          // ← 文本没变：不产生任何消息
  return createUserMessage({ content: [{ type:'text', text: snapshot }], source: … })
}
```
（`[PKG]dsh-agent-loop/lib/index.js:57-75`）

### 6.3 取代不是改写，是「追加 + 声明」

快照正文第一句固定为：

```
Current runtime context. This snapshot supersedes earlier runtime-context snapshots.
```
（`[PKG]dsh-system-prompt/lib/index.js:84-88`）

- 新快照以 `surfaceOp: 'append'` **追加**，旧快照**留在日志里**；
- 模型按「最新优先」读；`RuntimeContextProjection` 在快照被 `replace` 遮蔽时把 `retained` 清空（`[PKG]dsh-agent-loop:54`），以便下次变化重新发布；
- 本会话三条快照的演进（全部 `append`，零 `replace`）：

```
seq=8      466 chars  无日期   ← 初始
seq=76791  390 chars  无日期   ← 沙箱/审批策略变化触发重发
seq=248462 438 chars  含日期   ← 插件生效
```

### 6.4 与「系统提示词 section」的区别

| | `context()`（快照） | `section()`（系统提示词） |
|---|---|---|
| 落点 | 一条 `user/message` | 请求的 `system` 字符串 |
| 日志 | 文本变化时追加一条快照消息 | 变化时在 `request/header` 里重记**整份** system |
| 前缀缓存 | 尾部追加，前缀不变 | **头部被重写 → 整个前缀失效** |
| 被 preset 顶掉 | `includeRuntimeContext: false` → `contexts: []` | `complete: true` 的 section 会独占 `sections` |

（抑制逻辑：`[PKG]dsh-system-prompt/lib/index.js:243`、`:276`、`:284-289`；官方 `minimal` 与本地 `simple-reply` 两个 preset 同时设了这两项，因此**任何**提示词/上下文注入在那类 preset 下都失效。）

---

## 7. 体积与缓存

### 7.1 三种变更的代价

| 变更 | 请求序列怎么变 | 前缀缓存 |
|---|---|---|
| 追加消息（用户输入、注入上下文、快照） | 末尾多一条 | **不受影响**，只有新增后缀是 miss |
| `surfaceOp: replace` 遮蔽一段 | 可见序列变短 | 遮蔽点之后需要重算 |
| 改 `system` 或 `tools` | 头部被重写 | **整个前缀失效**（这是 Anthropic 系 `defer_loading` 想解决的问题） |

### 7.2 本会话实测

| 项 | 数值 |
|---|---|
| 日志 | 822 个 surface 事件，**全部 `append`，0 个 `replace`**；压缩后 2.1 MB，2731 个 zstd 帧 |
| `request/header` | 1 条：`system` 16853 字符 + 56 个工具 schema |
| 运行上下文快照 | 3 条，390–466 字符（JSONL 1055–1211 字节/条） |
| 真实用户消息 | 22 条 |
| 最大单条注入 | `skill-catalog` 56527 字节（19887 字符） |
| `subagent-settled` | 33683 字节/条 × 2 |
| 本插件贡献 | 46 字符 ≈ 12 token（`CHARS_PER_TOKEN=4`，`[PKG]dsh-token-meter/lib/index.js:15`），且仅在日期变化时随快照带上 |

---

## 8. 本插件在其中的位置

`dsh-date-wrapper` 只做一件事：往「动态运行上下文」通道里加一行。

```js
ctx.inject(['systemPrompt'], (scope) => {
  scope.systemPrompt.context({
    name: 'date-wrapper:date', order: 116,
    text: () => renderDate(Date.now(), formatter, zone),   // 每次 assemble 重新求值
  })
})
```

- 不产生额外 `user/message`：日期并入平台**本来就会发**的那条快照；
- 同一天内 0 条额外事件（`project()` 文本去重）；
- 跨天时追加一条新快照，旧的那条留在历史里，靠 supersedes 声明让最新生效；
- 前缀缓存不受影响（追加而非改写）。

---

## 9. 代码索引

| 主题 | 位置 |
|---|---|
| 事件 append 与深冻结 | `[PKG]dsh-session/lib/types/index.js:484-509` |
| surface 判定与 op 词表 | `[PKG]dsh-session/lib/types/surface.js:32-56,124-145,255-290` |
| 消息形状校验（导入边界） | `[PKG]dsh-session/lib/types/index.js:219-247` |
| JSONL 路径 / header / 批次编码 | `[PKG]dsh-session-persistence-jsonl/lib/index.js:145-198,160-172,1170-1199` |
| 多帧 zstd 解码 | 同上 `:336-383`、`:456-468` |
| legacy 消息 id 补铸 | `[PKG]dsh-session-persistence/lib/index.js:518-521,665-678` |
| pre-step 与默认决策 | `[PKG]dsh-agent-loop/lib/index.js:492-514` |
| inbox claim | `[PKG]dsh-agent/lib/types/inbox.js:50-57` |
| 请求组装 / header 比较 | `[PKG]dsh-agent-loop/lib/index.js:693-762,529-548` |
| 请求冻结与打标 | `[PKG]dsh-agent-loop/lib/index.js:751-761`、`[PKG]dsh-llm/lib/index.js:87-90` |
| `llm/stream` waterfall | `[PKG]dsh-llm/lib/index.js:1636-1641` |
| log-reconstruction 断言 | `[PKG]dsh-agent-loop/lib/invariant.js:15-33` |
| prompt 组装 / sections / contexts / variables | `[PKG]dsh-system-prompt/lib/index.js:65-102,186-230,240-289` |
| 快照去重与 supersedes | `[PKG]dsh-agent-loop/lib/index.js:26-75`、`[PKG]dsh-system-prompt/lib/index.js:84-88` |
| 工具 schema 提供者 | `[PKG]dsh-tools/lib/index.js:2595`、`[PKG]dsh-system-prompt/lib/index.js:280` |
| 技能目录的 digest + 批内替换 | `[PKG]dsh-tool-skill/lib/index.js:181-214,247,309-336` |
| 压缩检查点用 replace 遮蔽 | `[PKG]dsh-compaction-basic/lib/index.js:606-611` |
| token 估算启发式 | `[PKG]dsh-token-meter/lib/index.js:15` |
