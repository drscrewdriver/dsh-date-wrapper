# dsh-date-wrapper

- [English README](./README.md)
- [中文 README](./README.zh.md)
- [日本語 README](./README.ja.md)
- [한국어 README](./README.ko.md)
- [Installation guide](./INSTALL.md)
- [中文安装指南](./INSTALL.zh.md)
- [日本語インストールガイド](./INSTALL.ja.md)
- [한국어 설치 안내](./INSTALL.ko.md)
- [Changelog](./CHANGELOG.md)
- [日本語 changelog](./CHANGELOG.ja.md)
- [한국어 changelog](./CHANGELOG.ko.md)

> 精简版时间注入：把 `Current date: 2026-09-08 Asia/Shanghai Tuesday`（46 字符 ≈ 12 token）挂进 DSH 自带的运行上下文快照。
> 不加载 `@deepseek-ai/dsh-time-context`，不产生额外会话消息，不改 DSH 源码，不提 PR。

- [机制详解：DSH 会话、JSONL 与请求组装](./docs/dsh-session-and-context-mechanics.md)（中文）
- [交接文档 HANDOVER.md](./HANDOVER.md)（中文）

## 这个插件解决什么

DSH 自带的 `@deepseek-ai/dsh-time-context` 每次请求注入约 **280 字符**的元数据：

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

本插件把同样的信息压成一行 **46 字符**，并且换了一个落点 —— 不再往消息流里塞：

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| 维度 | `dsh-time-context` | `dsh-date-wrapper` |
|------|--------------------|--------------------|
| 注入文本 | ~280 字符 | 46 字符（↓84%），约 12 token |
| 落点 | 每条 pre-step 消息（`user/message`） | 平台运行上下文快照（`systemPrompt.context`） |
| 频率 | 每个 eligible step 一条 | 文本变化时随快照重发（同一天内 0 条） |
| 依赖 | `agents` 服务 | `systemPrompt` 服务 |
| 运行时依赖 | — | 零 |

## 版本适配与兼容性

| 项 | 结论 |
|---|---|
| 目标 DSH 版本 | 0.1.0-rc.7 → 0.1.3-alpha.2（契约稳定，见下表） |
| settings API | **不适用**：本插件不注册 settings，也不导出 schemastery `Config` |
| 使用的契约点 | 只有一个 —— `systemPrompt.context()` |
| 与原生功能冲突 | `@deepseek-ai/dsh-time-context` 功能重叠，**不要同时使用**。本插件默认不安装 = 默认关闭 |
| client 半 | **无**：不涉及 slot / DOM / CSS 语义 token |
| DSH 包 import | **零**：不 `import` 任何 `@deepseek-ai/*`，比「运行时检测 + 双 API 回退」更保守 |

| 契约点 | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 |
|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | ✅ | ✅（本机实装验证） | ✅ | ✅ |
| `PromptContext = { name, order, text }`，无 `complete` 字段 | ✅ | ✅ | ✅ | ✅ |
| `includeRuntimeContext` / `suppressRuntimeContext` | ✅ | ✅ | ✅ | ✅ |
| agent-loop `project()` 按文本去重、`surfaceOp: "append"` | ✅ | ✅ | ✅ | 未比对 |

> 验证方式：`npm pack @deepseek-ai/dsh-system-prompt@<版本>` 解包后比对 `lib/types/index.d.ts` 与 `lib/index.js`；`@deepseek-ai/dsh-agent-loop` 同法。
> **运行时**只在本机 0.1.1-rc.2 上验证过；0.1.2-rc.1 / 0.1.3-alpha.2 的运行时验证仍待做（见 `HANDOVER.md` §7）。

## 为什么用运行上下文快照，而不是消息

最初的做法是学 `dsh-time-context`，在 `agent/pre-step` 里追加一条 `user/message`。实测下来太贵：每条 JSONL 事件 **339 字节**（文本只占 46 字节，`content` 与 `sections` 各存一份），而它**每轮**都会写一条。

改成注册运行上下文后，日期并入平台本来就有的那条快照消息：

- 平台对快照**按文本去重**（`dsh-agent-loop` 的 `RuntimeContextProjection.project()`：`if (this.retained?.text === snapshot) return`），所以日期不变时**一条事件都不多**；
- 快照是**追加**新消息（`surfaceOp: 'append'`），不是原地改写，请求序列只增长 → **不破坏前缀缓存**；
- 我们的边际成本只有那 46 字节，且只在快照因文本变化而重发时才被带上。

本机实测（一个 10 轮 / 231 步的真实会话）：

| 项 | 实测 |
|----|------|
| 平台运行上下文快照 | 2 条，1133 B/条，共 2.3 KB |
| 真实用户消息 | 10 条，396 B/条 |
| 旧做法（每轮一条消息） | 10 条 × 339 B ≈ 3.4 KB |
| 本做法增量 | 0 条额外事件，日期约 46 B 并入已有快照 |

## 配置

`cordis.patch.yml` 里随行下发，改完需重启：

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA 时区；缺省用进程时区
```

- `timeZone` 非法会在启动时直接抛错（**不**静默降级成 UTC）。
- 文本里的时区名就是解析后的 IANA 名（`timeZone` 缺省时取进程时区名）。
- 运行上下文条目的名字是 `date-wrapper:date`，排序位 `116`（已占用：110 sandbox、115 approval、120 subagent）。
- 本插件**不导出 schemastery `Config`**，所以配置不走宿主的 schema 校验，校验全部在 `validateConfig()` 里手写（这也是「设置 → 插件」页没有本插件配置表单的原因）。

## 开关：靠插件激活，没有面板开关

本插件**不提供**设置面板开关，也**没有** `enabled` 之类的 config 字段。原因：

- 功能开关 = **插件行是否激活**。插件未激活 → `apply()` 不跑 → 运行上下文条目不存在 → 一个字都不会注入。
- 本插件没有 client 半（无 `dsh.client`），界面上没有任何属于它的控件。
- DSH 自带的 **设置 → 插件** 页面已经会显示每个条目的 `已启用 / 已停用`（只读，不能点）。

### 怎么关

在**你自己的** profile patch 层里按 `id` 覆盖即可 —— `C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`：

```yaml
- id: date-wrapper
  disabled: true    # 停用；改回 false 即恢复
```

- **热生效，无需重启**：该文件被 Cordis HMR 监听，`disabled: true` 会直接 `dispose` 该行的 fiber。
- 若 `date-wrapper` 行还不存在（未安装），这条 patch 只会打一条 `entry "date-wrapper" not found` 警告，不会让启动失败。
- ⚠️ 该文件必须是**顶层 YAML 数组**；写坏了会**启动失败**（DSH 对用户 patch 层是 fail-loud）。

### 怎么彻底移除

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

卸载走 bundle 层，**需要重启** dsh web 才生效（bundle patch 不热重载）。

## 安装

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

重启 dsh web 并刷新页面。本地路径 / 软链安装与排错详见 [INSTALL.zh.md](./INSTALL.zh.md)。

## 验证

| # | 怎么验证 | 期望 |
|---|----------|------|
| A1 | 新开一个会话，发一句话 | 运行上下文快照里出现 `Current date: YYYY-MM-DD <时区> <星期>`（会话里显示为一条注入上下文行，来源含 `system-prompt`） |
| A2 | 看该行文本 | ≤50 字符（实测 46；PRD 原阈值 30，因用户指定格式放宽） |
| A3 | 停用插件（profile patch 置 `disabled: true`） | 后续会话快照里不再出现该行 |
| A4 | 搜索会话日志 | 没有 `Time sampled` / `Elapsed since` / `Browser time zone` |
| A5 | 把 `timeZone` 改成 `UTC` 并重启 | 日期按 UTC 计算（跨时区边界会差一天） |

## 实现要点

```
dsh-date-wrapper/
├── package.json          # name / type: module / main / exports["."] / dsh.bundle.patch / files
├── cordis.patch.yml      # 一行 insert（无 patch 级 id → 落在 profile 根 = 宿主面）
├── src/
│   ├── format.js         # 纯函数：resolveZone / renderDate / createDateContextText / validateConfig / TEXT_LABEL
│   └── index.js          # apply(ctx, config) → ctx.inject(['systemPrompt'], …) → systemPrompt.context(...)
└── tests/
    ├── format.test.mjs   # 11 项（时区投影、星期、格式与长度、降级、配置校验）
    └── context.test.mjs  # 7 项（伪 ctx 断言注册契约）
```

- **宿主面行**：`ctx.inject(['systemPrompt'], …)` 建立子 fiber；服务缺失时静默不注册，而不是让整个 boot 失败。
- **fail-soft 的文本 provider**：prompt 组装期抛错会让**每一次请求**都失败，所以渲染失败时返回空串（平台会过滤掉空文本）。
- **不设 `complete`**：设了会顶掉整份系统提示词。
- **去重交给平台**：不维护任何 per-agent 状态，跨天时快照自动带上新日期。
- **生命周期**：注册归属 `ctx.inject` 的子 fiber，插件停用时随 fiber 回收。

## 开发：TDD + lint

```bash
npm install          # 只装 devDependencies（eslint / @eslint/js），运行时零依赖

npm run tdd          # 监听模式：改 src/ 或 tests/ 自动重跑（node --test --watch）
npm test             # 单次全量：node --test "tests/*.test.mjs"
node tests/format.test.mjs   # 单文件直接跑（沙箱里最稳，不派生子进程）

npm run lint         # eslint .（src + tests + eslint.config.mjs）
npm run lint:fix     # 自动修可修的
npm run verify       # lint + test，提交前跑这一条
```

### 红-绿-重构

测试用例直接对应验收项，流程是「先写一条会红的断言，再让它变绿」：

| 步骤 | 动作 | 命令 |
|------|------|------|
| 1 红 | 在 `tests/*.test.mjs` 里写一条按验收项命名的断言，断言当前行为**不满足**的期望 | `npm run tdd` |
| 2 绿 | 在 `src/` 里写最小实现让它通过，不动其它断言 | `npm run tdd` |
| 3 重构 | 保持全绿的前提下整理命名/抽纯函数；`src/format.js` 承担全部纯逻辑，`src/index.js` 只做注册 | `npm run tdd` |
| 4 闸门 | 提交前跑 lint + 全量测试 | `npm run verify` |

现有 18 条断言：`format.test.mjs`（11 条）覆盖纯函数，`context.test.mjs`（7 条）用伪 ctx 断言注册契约。

### lint 配置要点

- ESLint 10 扁平配置（`eslint.config.mjs`），`@eslint/js` recommended 为基线。
- 收紧项：`eqeqeq`、`prefer-const`、`object-shorthand`、`no-unused-vars`（`_` 前缀豁免）。
- 显式声明 Node 全局 `crypto` / `console` / `process`，否则 `no-undef` 会误报。

## 已知限制

- **fixed-prompt preset 下不生效**：若某个 preset 的 persona 设了 `includeRuntimeContext: false`（官方 `minimal` 与本地 `simple-reply` 都是），`assemble()` 会返回 `contexts: []`，本插件的条目会被整段丢掉。这类 preset 的设计意图就是「不允许后续 listener 往提示词里加东西」。
- **旧快照会留在历史里**：日期变化时平台追加一条新快照（旧快照保留），靠快照自带的 "This snapshot supersedes earlier runtime-context snapshots" 声明让最新一条生效 —— 这与平台处理 cwd / sandbox / approval 策略变化的方式一致。
- **bundle patch 不热重载**：改 `cordis.patch.yml` 或升级插件后必须重启 dsh web（改 profile patch 的 `disabled` 是热生效的）。
- **不加载也不过滤 `dsh-time-context`**：若你在某个 preset 里显式挂载它，它的 verbose 文本会照常出现。不要同时使用。
- **契约点未做运行时探测**：`systemPrompt.context` 目前是裸调用，若 DSH 未来改名，表现为插件加载失败而非静默降级（待办见 `HANDOVER.md` §7）。

## License

MIT
