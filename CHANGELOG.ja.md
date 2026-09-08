# 変更履歴

このプロジェクトの注目すべき変更はすべてこのファイルに記録されています。
形式は [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) に従い、このプロジェクトは [Semantic Versioning](https://semver.org/spec/v2.0.0.html) に準拠します。

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

## 0.1.0 — 2026-09-08

初回リリース。

### 追加

- 現在の日付を動的なランタイムコンテキスト（`systemPrompt.context`）として登録するホスト側プラグイン。`Current date: 2026-09-08 Asia/Shanghai Tuesday` としてレンダリングされ、46文字、およそ12トークン、時刻は含みません。
- 単一の `insert` 行（`id: date-wrapper`、`config.timeZone: Asia/Shanghai`）を持つ `cordis.patch.yml` バンドルパッチ。
- 起動時に検証される `timeZone` 設定: 無効または解決不能な IANA ゾーンは、黙って UTC にフォールバックせず例外を投げます。
- フェイルソフトなテキストプロバイダ: レンダリング失敗時は空文字列を返すため、プロンプト組み立てがプラグインのせいで例外を投げることはありません。
- `node --test` による 18 個のアサーション: ゾーン投影、ゾーン境界をまたぐ曜日の正しさ、正確な形式と長さ、劣化、設定検証、および偽のコンテキストに対する登録コントラクト。
- ESLint 10 のフラット設定。`npm run verify` が lint + テストをゲートします。
- 実行時依存関係ゼロ、`@deepseek-ai/*` のインポートもゼロ。

### ドキュメント

- `README.{md,zh,ja,ko}`、`INSTALL.{md,zh,ja,ko}`、`CHANGELOG.{md,ja,ko}`（相互リンクされた言語切り替え付き）。
- 0.1.0-rc.7 → 0.1.3-alpha.2 をカバーするバージョン互換性マトリクス。
- `docs/dsh-session-and-context-mechanics.md` — DSH がセッションを JSONL に変換し、リクエストを組み立てる仕組み（中国語）。
- `HANDOVER.md` — プロジェクトの引き継ぎと設計根拠（中国語）。

### 注記

- `@deepseek-ai/dsh-time-context` との機能重複があります。両方をマウントしないでください。
- 設計上、設定パネルはありません — プラグイン行の有効化・非アクティブ化がスイッチです。
- ペルソナが `includeRuntimeContext: false` を設定している固定プロンプトのプリセットでは非アクティブです。
