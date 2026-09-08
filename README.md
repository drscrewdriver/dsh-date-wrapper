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

> A minimal date line: it hangs `Current date: 2026-09-08 Asia/Shanghai Tuesday` (46 characters, ~12 tokens) onto the runtime-context snapshot DSH already sends.
> It does **not** load `@deepseek-ai/dsh-time-context`, does **not** add extra session messages, does **not** patch DSH source, and needs no PR.

- [How it works: DSH sessions, JSONL and request assembly](./docs/dsh-session-and-context-mechanics.md) (Chinese)
- [HANDOVER.md](./HANDOVER.md) (Chinese)

## What this plugin solves

DSH's own `@deepseek-ai/dsh-time-context` injects about **280 characters** of metadata on every request:

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

This plugin compresses the same information into a single **46-character** line and moves where it lands — it no longer goes into the message stream:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| Dimension | `dsh-time-context` | `dsh-date-wrapper` |
|-----------|--------------------|--------------------|
| Injected text | ~280 characters | 46 characters (↓84%), ~12 tokens |
| Landing point | One message per pre-step (`user/message`) | The platform runtime-context snapshot (`systemPrompt.context`) |
| Frequency | One event per eligible step | Re-sent with the snapshot only when the text changes (0 events within a day) |
| Dependency | `agents` service | `systemPrompt` service |
| Runtime dependencies | — | none |

## Version compatibility

| Item | Verdict |
|------|---------|
| Target DSH versions | 0.1.0-rc.7 → 0.1.3-alpha.2 (contract stable, see the table below) |
| settings API | **Not applicable**: the plugin registers no settings and exports no schemastery `Config` |
| Contract points used | Exactly one — `systemPrompt.context()` |
| Conflict with a native feature | Overlaps `@deepseek-ai/dsh-time-context`; **do not use both**. Not installed by default = off by default |
| Browser half | **None**: no slot, no DOM, no CSS semantic tokens |
| DSH package imports | **Zero**: nothing from `@deepseek-ai/*`, which is stricter than the "runtime detection + dual API fallback" pattern |

| Contract point | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 |
|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | yes | yes (verified on this host) | yes | yes |
| `PromptContext = { name, order, text }`, no `complete` field | yes | yes | yes | yes |
| `includeRuntimeContext` / `suppressRuntimeContext` | yes | yes | yes | yes |
| agent-loop `project()` text dedupe and `surfaceOp: "append"` | yes | yes | yes | not compared |

> Method: `npm pack @deepseek-ai/dsh-system-prompt@<version>`, unpack, and compare `lib/types/index.d.ts` and `lib/index.js`; the same for `@deepseek-ai/dsh-agent-loop`.
> Only 0.1.1-rc.2 has been verified **at runtime** on this host; runtime verification on 0.1.2-rc.1 / 0.1.3-alpha.2 is still pending (see `HANDOVER.md` §7).

## Why a runtime-context snapshot instead of a message

The first attempt copied `dsh-time-context` and appended a `user/message` in `agent/pre-step`. Measured cost was too high: each JSONL event is **339 bytes** (the text is only 46 of them, because `content` and `sections` each store a copy) and it wrote one **every turn**.

Registering a runtime context instead folds the date into the snapshot message the platform already sends:

- The platform **deduplicates snapshots by text** (`RuntimeContextProjection.project()` in `dsh-agent-loop`: `if (this.retained?.text === snapshot) return`), so while the date is unchanged **not a single extra event is written**;
- Snapshots **append** a new message (`surfaceOp: 'append'`) rather than rewriting in place, so the request sequence only grows → **the prefix cache is preserved**;
- Our marginal cost is those 46 bytes, and only when the snapshot is re-sent because its text changed.

Measured on this host (one real session, 10 turns / 231 steps):

| Item | Measured |
|------|----------|
| Platform runtime-context snapshots | 2 events, 1133 B each, 2.3 KB total |
| Real user messages | 10 events, 396 B each |
| Old approach (one message per turn) | 10 × 339 B ≈ 3.4 KB |
| This approach | 0 extra events; ~46 B folded into an existing snapshot |

## Configuration

Shipped with `cordis.patch.yml`; restart after changing it:

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA zone; omit to use the process zone
```

- An invalid `timeZone` throws at startup (**no** silent fallback to UTC).
- The zone name in the text is the resolved IANA name (the process zone name when `timeZone` is omitted).
- The runtime-context entry is named `date-wrapper:date` with order `116` (already taken: 110 sandbox, 115 approval, 120 subagent).
- The plugin exports **no schemastery `Config`**, so its config skips the host schema validation; everything is validated by hand in `validateConfig()`. That is also why the Settings → Plugins page has no config form for it.

## On/off: the plugin's activation is the switch, there is no panel toggle

The plugin ships **no** settings-panel toggle and **no** `enabled` config field, because:

- The feature switch *is* whether the plugin row is active. Inactive → `apply()` never runs → the runtime-context entry does not exist → not a single character is injected.
- There is no browser half (`dsh.client`), so the UI owns no widget of ours.
- DSH's built-in **Settings → Plugins** page already shows each entry as `enabled / disabled` (read-only).

### How to turn it off

Override it by `id` in **your own** profile patch layer — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **Hot, no restart**: that file is watched by Cordis HMR, and `disabled: true` disposes the row's fiber directly.
- If the `date-wrapper` row does not exist yet (not installed), this patch only logs an `entry "date-wrapper" not found` warning; startup still succeeds.
- ⚠️ The file must be a **top-level YAML array**; if it is malformed, **startup fails** (DSH is fail-loud for user patch layers).

### How to remove it completely

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

Removal goes through the bundle layer and **requires a restart** of dsh web (bundle patches are not hot-reloaded).

## Install

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Restart dsh web and refresh the page. Local paths, link mode and troubleshooting: [INSTALL.md](./INSTALL.md).

## Verification

| # | How | Expected |
|---|-----|----------|
| A1 | Open a new session and send one message | The runtime-context snapshot contains `Current date: YYYY-MM-DD <zone> <weekday>` (shown as an injected context row sourced from `system-prompt`) |
| A2 | Check that line | ≤50 characters (46 measured; the PRD threshold of 30 was relaxed for the requested format) |
| A3 | Disable the plugin (profile patch `disabled: true`) | The line no longer appears in later sessions' snapshots |
| A4 | Search the session log | No `Time sampled` / `Elapsed since` / `Browser time zone` |
| A5 | Set `timeZone` to `UTC` and restart | The date follows UTC (may differ by one day across zone boundaries) |

## Implementation notes

```
dsh-date-wrapper/
├── package.json          # name / type: module / main / exports["."] / dsh.bundle.patch / files
├── cordis.patch.yml      # one insert row (no patch-level id → lands at the profile root = host plane)
├── src/
│   ├── format.js         # pure functions: resolveZone / renderDate / createDateContextText / validateConfig / TEXT_LABEL
│   └── index.js          # apply(ctx, config) → ctx.inject(['systemPrompt'], …) → systemPrompt.context(...)
└── tests/
    ├── format.test.mjs   # 11 cases (zone projection, weekday, format and length, degradation, config validation)
    └── context.test.mjs  # 7 cases (registration contract against a fake ctx)
```

- **Host-plane row**: `ctx.inject(['systemPrompt'], …)` opens a child fiber; if the service is missing, the plugin silently registers nothing instead of failing the whole boot.
- **Fail-soft text provider**: throwing during prompt assembly would fail **every** request, so a render failure returns an empty string (the platform filters empty text out).
- **No `complete`**: setting it would shadow the entire system prompt.
- **Deduplication is the platform's job**: no per-agent state is kept; across midnight the snapshot simply carries the new date.
- **Lifecycle**: the registration belongs to the `ctx.inject` child fiber and is reclaimed when the plugin is deactivated.

## Development: TDD + lint

```bash
npm install          # devDependencies only (eslint / @eslint/js); zero runtime dependencies

npm run tdd          # watch mode: rerun on src/ or tests/ changes (node --test --watch)
npm test             # one full run: node --test "tests/*.test.mjs"
node tests/format.test.mjs   # run a single file (most reliable under a sandbox: no child process)

npm run lint         # eslint . (src + tests + eslint.config.mjs)
npm run lint:fix     # auto-fix what can be fixed
npm run verify       # lint + test; run this before committing
```

### Red-green-refactor

Test cases map directly to acceptance criteria: write a failing assertion first, then make it pass.

| Step | Action | Command |
|------|--------|---------|
| 1 red | Add an assertion in `tests/*.test.mjs` named after the acceptance criterion, asserting the behaviour you do **not** have yet | `npm run tdd` |
| 2 green | Write the minimal implementation in `src/` to pass it without touching other assertions | `npm run tdd` |
| 3 refactor | Rename and extract pure functions while staying green; `src/format.js` holds all pure logic, `src/index.js` only registers | `npm run tdd` |
| 4 gate | Run lint + the full suite before committing | `npm run verify` |

18 assertions today: `format.test.mjs` (11) covers the pure functions, `context.test.mjs` (7) asserts the registration contract against a fake ctx.

### Lint configuration highlights

- ESLint 10 flat config (`eslint.config.mjs`) with `@eslint/js` recommended as the baseline.
- Tightened rules: `eqeqeq`, `prefer-const`, `object-shorthand`, `no-unused-vars` (`_` prefix exempt).
- Node globals `crypto` / `console` / `process` are declared explicitly, otherwise `no-undef` false-positives.

## Known limitations

- **Inactive under fixed-prompt presets**: if a preset's persona sets `includeRuntimeContext: false` (the official `minimal` and the local `simple-reply` both do), `assemble()` returns `contexts: []` and this plugin's entry is dropped wholesale. Those presets are designed to forbid later listeners from adding anything to the prompt.
- **Old snapshots stay in history**: when the date changes the platform appends a new snapshot (the old one is kept) and the new one takes effect through its own "This snapshot supersedes earlier runtime-context snapshots" declaration — the same way the platform handles cwd / sandbox / approval policy changes.
- **Bundle patches are not hot-reloaded**: changing `cordis.patch.yml` or upgrading the plugin requires a dsh web restart (changing `disabled` in the profile patch is hot).
- **`dsh-time-context` is neither loaded nor filtered**: if you mount it explicitly in a preset, its verbose text appears as usual. Do not use both.
- **No runtime probe for the contract point**: `systemPrompt.context` is called unguarded, so a future DSH rename would surface as a plugin load failure instead of a silent degradation (see `HANDOVER.md` §7).

## License

MIT
