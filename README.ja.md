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

> 最小限の日付行です。DSH がすでに送信しているランタイムコンテキストスナップショットに `Current date: 2026-09-08 Asia/Shanghai Tuesday`（46文字、約12トークン）をぶら下げるだけです。
> `@deepseek-ai/dsh-time-context` を**読み込まず**、余分なセッションメッセージを**追加せず**、DSH のソースを**パッチせず**、PR も必要ありません。

- [動作原理: DSH のセッション、JSONL、リクエスト組み立て](./docs/dsh-session-and-context-mechanics.md)（中国語）
- [HANDOVER.md](./HANDOVER.md)（中国語）

## このプラグインが解決する課題

DSH 自身の `@deepseek-ai/dsh-time-context` は、リクエストごとに約 **280文字** のメタデータを注入します:

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

このプラグインは同じ情報を **46文字** の 1 行に圧縮し、さらにその着地点を移動します — もうメッセージストリームには入りません:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| 項目 | `dsh-time-context` | `dsh-date-wrapper` |
|-----------|--------------------|--------------------|
| 注入されるテキスト | 約280文字 | 46文字（↓84%）、約12トークン |
| 着地点 | プレステップごとに 1 メッセージ（`user/message`） | プラットフォームのランタイムコンテキストスナップショット（`systemPrompt.context`） |
| 頻度 | 対象となるステップごとに 1 イベント | テキストが変化したときにだけスナップショットと共に再送信（1 日以内は 0 イベント） |
| 依存関係 | `agents` サービス | `systemPrompt` サービス |
| 実行時依存関係 | — | なし |

## バージョン互換性

| 項目 | 判定 |
|------|---------|
| 対象 DSH バージョン | 0.1.0-rc.7 → 0.1.3-alpha.2（コントラクトは安定。下の表を参照） |
| settings API | **該当なし**: プラグインは設定を登録せず、schemastery の `Config` もエクスポートしません |
| 使用しているコントラクトポイント | ちょうど 1 つ — `systemPrompt.context()` |
| ネイティブ機能との競合 | `@deepseek-ai/dsh-time-context` と重複します。**両方を同時に使わないでください**。デフォルトではインストールされない = デフォルトでオフ |
| ブラウザ側 | **なし**: スロットも DOM も CSS セマンティックトークンもありません |
| DSH パッケージのインポート | **ゼロ**: `@deepseek-ai/*` から何も取り込みません。これは「実行時検出 + デュアル API フォールバック」パターンよりも厳格です |

| コントラクトポイント | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 |
|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | yes | yes（このホストで検証済み） | yes | yes |
| `PromptContext = { name, order, text }`、`complete` フィールドなし | yes | yes | yes | yes |
| `includeRuntimeContext` / `suppressRuntimeContext` | yes | yes | yes | yes |
| agent-loop の `project()` によるテキスト重複排除と `surfaceOp: "append"` | yes | yes | yes | 未比較 |

> 方法: `npm pack @deepseek-ai/dsh-system-prompt@<version>` で取得して展開し、`lib/types/index.d.ts` と `lib/index.js` を比較。`@deepseek-ai/dsh-agent-loop` も同様。
> このホストで**実行時に**検証済みなのは 0.1.1-rc.2 のみです。0.1.2-rc.1 / 0.1.3-alpha.2 の実行時検証はまだ保留中です（`HANDOVER.md` §7 を参照）。

## メッセージではなくランタイムコンテキストスナップショットを使う理由

最初の試みは `dsh-time-context` をコピーし、`agent/pre-step` で `user/message` を追加するものでした。計測したコストは高すぎました。各 JSONL イベントは **339バイト**（うちテキストは 46バイトに過ぎません。`content` と `sections` がそれぞれコピーを保持するためです）で、しかも**毎ターン**書き込まれていました。

代わりにランタイムコンテキストを登録すると、日付はプラットフォームがすでに送信しているスナップショットメッセージに畳み込まれます:

- プラットフォームは**テキストでスナップショットを重複排除**します（`dsh-agent-loop` の `RuntimeContextProjection.project()`: `if (this.retained?.text === snapshot) return`）。したがって日付が変わらない間は**余分なイベントは 1 つも書き込まれません**。
- スナップショットはその場で書き換えるのではなく新しいメッセージを**追加**します（`surfaceOp: 'append'`）。そのためリクエスト列は増える一方です → **プレフィックスキャッシュが保持されます**。
- こちらの限界コストはこの 46バイトだけで、しかもテキストが変わったためにスナップショットが再送信されるときに限られます。

このホストで計測（実際の 1 セッション、10 ターン / 231ステップ）:

| 項目 | 計測値 |
|------|----------|
| プラットフォームのランタイムコンテキストスナップショット | 2 イベント、各 1133 B、合計 2.3 KB |
| 実際のユーザーメッセージ | 10 イベント、各 396 B |
| 旧アプローチ（1 ターンに 1 メッセージ） | 10 × 339 B ≈ 3.4 KB |
| 本アプローチ | 余分なイベント 0。既存スナップショットに約 46 B を畳み込み |

## 設定

`cordis.patch.yml` に同梱されています。変更後は再起動してください:

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA zone; omit to use the process zone
```

- 無効な `timeZone` は起動時に例外を投げます（UTC への暗黙のフォールバックは**ありません**）。
- テキスト内のゾーン名は解決済みの IANA 名です（`timeZone` を省略した場合はプロセスのゾーン名）。
- ランタイムコンテキストのエントリ名は `date-wrapper:date`、order は `116`（すでに使用済み: 110 sandbox、115 approval、120 subagent）。
- プラグインは schemastery の `Config` を**エクスポートしない**ため、その設定はホストのスキーマ検証をスキップします。検証はすべて `validateConfig()` で手作業で行われます。これが Settings → Plugins ページにこのプラグインの設定フォームが存在しない理由でもあります。

## オン/オフ: プラグインの有効化そのものがスイッチで、パネルのトグルはありません

プラグインは設定パネルのトグルも `enabled` 設定フィールドも**同梱していません**。理由は次のとおりです:

- 機能スイッチは*プラグイン行が有効かどうか*そのものです。無効 → `apply()` が実行されない → ランタイムコンテキストのエントリが存在しない → 1 文字も注入されない。
- ブラウザ側（`dsh.client`）が存在しないため、UI が持つ私たちのウィジェットはありません。
- DSH 組み込みの **Settings → Plugins** ページは、各エントリをすでに `enabled / disabled` として表示します（読み取り専用）。

### オフにする方法

**自分の**プロファイルパッチレイヤー — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml` — で `id` によって上書きします:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **ホット、再起動不要**: このファイルは Cordis HMR が監視しており、`disabled: true` はその行の fiber を直接破棄します。
- `date-wrapper` 行がまだ存在しない場合（未インストール）、このパッチは `entry "date-wrapper" not found` の警告をログに出すだけで、起動は成功します。
- ⚠️ ファイルは**トップレベルの YAML 配列**でなければなりません。形式が不正だと**起動に失敗します**（DSH はユーザーパッチレイヤーに対して fail-loud です）。

### 完全に削除する方法

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

削除はバンドルレイヤーを経由し、dsh web の**再起動が必要**です（バンドルパッチはホットリロードされません）。

## インストール

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

dsh web を再起動し、ページを更新してください。ローカルパス / リンクモード / トラブルシューティングは [INSTALL.ja.md](./INSTALL.ja.md) を参照してください。

## 検証

| # | 方法 | 期待結果 |
|---|-----|----------|
| A1 | 新しいセッションを開き、メッセージを 1 つ送信する | ランタイムコンテキストスナップショットに `Current date: YYYY-MM-DD <zone> <weekday>` が含まれる（`system-prompt` を出自とする注入コンテキスト行として表示される） |
| A2 | その行を確認する | 50文字以下（計測値は 46文字。PRD のしきい値 30 は、要望された形式のために緩和された） |
| A3 | プラグインを無効化する（プロファイルパッチ `disabled: true`） | 以降のセッションのスナップショットにその行が現れなくなる |
| A4 | セッションログを検索する | `Time sampled` / `Elapsed since` / `Browser time zone` が存在しない |
| A5 | `timeZone` を `UTC` に設定して再起動する | 日付が UTC に従う（ゾーン境界をまたぐと 1 日ずれることがある） |

## 実装メモ

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

- **ホストプレーンの行**: `ctx.inject(['systemPrompt'], …)` は子 fiber を開きます。サービスが存在しない場合、プラグインはブート全体を失敗させるのではなく、何も登録せずに静かに終了します。
- **フェイルソフトなテキストプロバイダ**: プロンプト組み立て中に例外を投げると**すべての**リクエストが失敗するため、レンダリング失敗時は空文字列を返します（プラットフォームは空テキストを除外します）。
- **`complete` なし**: 設定するとシステムプロンプト全体を覆い隠してしまいます。
- **重複排除はプラットフォームの仕事**: エージェントごとの状態は保持しません。日付をまたげば、スナップショットは単に新しい日付を運びます。
- **ライフサイクル**: 登録は `ctx.inject` の子 fiber に属し、プラグインが非アクティブ化されると回収されます。

## 開発: TDD + lint

```bash
npm install          # devDependencies only (eslint / @eslint/js); zero runtime dependencies

npm run tdd          # watch mode: rerun on src/ or tests/ changes (node --test --watch)
npm test             # one full run: node --test "tests/*.test.mjs"
node tests/format.test.mjs   # run a single file (most reliable under a sandbox: no child process)

npm run lint         # eslint . (src + tests + eslint.config.mjs)
npm run lint:fix     # auto-fix what can be fixed
npm run verify       # lint + test; run this before committing
```

### レッド・グリーン・リファクタリング

テストケースは受け入れ基準に直接対応します。まず失敗するアサーションを書き、それから通るようにします。

| ステップ | アクション | コマンド |
|------|--------|---------|
| 1 red | 受け入れ基準にちなんで命名したアサーションを `tests/*.test.mjs` に追加し、まだ**持っていない**挙動をアサートする | `npm run tdd` |
| 2 green | 他のアサーションに触れずに通すための最小限の実装を `src/` に書く | `npm run tdd` |
| 3 refactor | グリーンを保ったままリネームと純粋関数の抽出を行う。`src/format.js` がすべての純粋ロジックを持ち、`src/index.js` は登録だけを行う | `npm run tdd` |
| 4 gate | コミット前に lint と全スイートを実行する | `npm run verify` |

現在 18 個のアサーション: `format.test.mjs`（11）が純粋関数をカバーし、`context.test.mjs`（7）が偽の ctx に対する登録コントラクトをアサートします。

### lint 設定のポイント

- ESLint 10 のフラット設定（`eslint.config.mjs`）で、ベースラインとして `@eslint/js` の recommended を使用。
- 厳格化したルール: `eqeqeq`、`prefer-const`、`object-shorthand`、`no-unused-vars`（`_` プレフィックスは除外）。
- Node のグローバル `crypto` / `console` / `process` を明示的に宣言。そうしないと `no-undef` が誤検出します。

## 既知の制限

- **固定プロンプトのプリセットでは非アクティブ**: プリセットのペルソナが `includeRuntimeContext: false` を設定している場合（公式の `minimal` とローカルの `simple-reply` の両方がそう）、`assemble()` は `contexts: []` を返し、このプラグインのエントリは丸ごと破棄されます。これらのプリセットは、後続のリスナーがプロンプトに何も追加できないように設計されています。
- **古いスナップショットは履歴に残る**: 日付が変わるとプラットフォームは新しいスナップショットを追加し（古いものは保持される）、新しいものは「このスナップショットは以前のランタイムコンテキストスナップショットを上書きします」という自身の宣言によって有効になります — プラットフォームが cwd / sandbox / approval ポリシーの変更を扱うのと同じ方法です。
- **バンドルパッチはホットリロードされない**: `cordis.patch.yml` の変更やプラグインのアップグレードには dsh web の再起動が必要です（プロファイルパッチの `disabled` の変更はホットです）。
- **`dsh-time-context` は読み込まれず、フィルタもされない**: プリセットで明示的にマウントすると、その冗長なテキストが通常どおり表示されます。両方を併用しないでください。
- **コントラクトポイントの実行時プローブはなし**: `systemPrompt.context` はガードなしで呼び出されるため、将来 DSH がリネームすると、静かな劣化ではなくプラグインの読み込み失敗として表面化します（`HANDOVER.md` §7 を参照）。

## ライセンス

MIT
