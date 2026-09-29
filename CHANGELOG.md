# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## Unreleased

### Changed

- **DSH dual-version support (0.1.0-rc.7 … 0.1.2-rc.1).** Documented the compatibility matrix in
  the README (EN/ZH) and added `engines.dsh`. No code change: the plugin's only host contract,
  `systemPrompt.context({ name, order, text })`, is signature- and semantics-identical between
  `dsh-v0.1.1-rc.2` and `dsh-v0.1.2-rc.1`, and the plugin registers no settings namespace, reads
  no session data and makes no RPC call.

## 0.1.5 — 2026-09-29

### Changed

- **DSH 0.1.5 line support (`>=0.1.5-rc.1 <0.1.6-0`).** Dedicated artifact 0.1.5 on branch
  `compat/0.1.5`, dist-tag `dsh-0.1.5`. Verified against `dsh-v0.1.5-rc.2`: `systemPrompt.context`
  contract identical, orders 110/115/120 taken and 116 free, vendor cordis 4.0.2 satisfied by
  peer `^4.0.2`.

## 0.3.0 — 2026-09-29

### Changed

- **DSH 0.2.0 line support (`>=0.2.0-rc.1 <0.2.1-0`).** `engines.dsh` updated in both
  `package.json` and `dsh.plugin.json`; version bumped to 0.3.0 in both manifests. No code
  change: between `dsh-v0.1.7-rc.2` and `dsh-v0.2.0-rc.1` the `packages/core/system-prompt`
  diff is a single version line, the `order: 116` slot stays collision-free (110/115/120
  unchanged), and the plugin migration guide has no `systemPrompt` entry. The 0.1.x line
  (0.1.0-rc.7 → 0.1.7.x) remains served by artifact ≤ 0.2.0 (dist-tag `dsh-0.1.7`).

### Fixed

- Reconciled the npm-published 0.2.0 version bump into git history (it was previously
  published from an uncommitted working tree).

## 0.1.0 — 2026-09-08

First release.

### Added

- Host-half plugin that registers the current date as a dynamic runtime context (`systemPrompt.context`), rendered as `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 characters, roughly 12 tokens, no time of day.
- `cordis.patch.yml` bundle patch with a single `insert` row (`id: date-wrapper`, `config.timeZone: Asia/Shanghai`).
- `timeZone` configuration validated at startup: an invalid or unresolvable IANA zone throws instead of silently falling back to UTC.
- Fail-soft text provider: a render failure returns an empty string, so prompt assembly never throws on the plugin's behalf.
- 18 assertions via `node --test`: zone projection, weekday correctness across zone boundaries, exact format and length, degradation, config validation, and the registration contract against a fake context.
- ESLint 10 flat config; `npm run verify` gates lint + tests.
- Zero runtime dependencies and zero `@deepseek-ai/*` imports.

### Documentation

- `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}` with cross-linked language switches.
- Version-compatibility matrix covering 0.1.0-rc.7 → 0.1.3-alpha.2.
- `docs/dsh-session-and-context-mechanics.md` — how DSH turns sessions into JSONL and assembles requests (Chinese).
- `HANDOVER.md` — project handover and design rationale (Chinese).

### Notes

- Functional overlap with `@deepseek-ai/dsh-time-context`: do not mount both.
- No settings panel by design — activating or deactivating the plugin row is the switch.
- Inactive under fixed-prompt presets whose persona sets `includeRuntimeContext: false`.
