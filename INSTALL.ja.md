# インストールガイド（公式 DSH CLI）

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

## 0. 前提条件

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # this guide was verified on 0.1.1-rc.2
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. インストール

**絶対パス**を使用してください（推奨 — パスはそのまま pnpm に転送されます）:

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

または開発中はリンクモードで（ソースの編集が即座に反映され、再インストールは不要）:

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ 相対パスが**現在のディレクトリ**を基準に解決されるのは、`.` または `..` で始まる場合だけです。
> `mine-dsh-plugins\dsh-date-wrapper` はプロファイルディレクトリ内で解決されるため見つかりません。絶対パスが最も安全です。

インストール成功の目印:

1. pnpm が終了コード 0 で終わる。
2. `C:\Users\<you>\.dsh\profiles\web\package.json` の `dependencies` に `dsh-date-wrapper` が並ぶ。
3. 同じファイルの `dsh.profile.bundles` の末尾に `dsh-date-wrapper` が加わる（パッケージが `dsh.bundle.patch` を宣言しているため、自動的にレイヤー一覧に取り込まれます）。

## 2. 再起動

```powershell
# stop the running dsh web process, then start it again
dsh web
```

その後、ブラウザのページを更新してください。

> バンドルパッチは**ホットリロードされません**。監視されるのはプロファイル / ホームのパッチレイヤーだけです。プラグイン自身の
> `cordis.patch.yml` の変更やプラグインのアップグレードには、常に再起動が必要です。

## 3. 検証

新しいセッションを開き、任意のメッセージを送信してください。日付は**ランタイムコンテキストスナップショット**にぶら下がります（セッション内では `system-prompt` を出自とする注入コンテキスト行として表示されます）。表示は次のとおりです:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

これは `Current date: ` + `<ISO date> <IANA zone> <English weekday>` で、46文字（約12トークン）、**時・分・秒はありません**。

コマンドラインからプラグイン自体を試すこともできます:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. トラブルシューティング

| 症状 | 原因と対処 |
|---------|---------------|
| 起動が `date-wrapper: 非法 IANA timeZone` で失敗する | `cordis.patch.yml` の `timeZone` が誤っています。これは**意図的なフェイルファスト**です。黙って UTC の誤った日付を出力するより、起動時に失敗するほうがよいからです |
| 起動が `duplicate loader entry id: date-wrapper` で失敗する | 組み立てツリーにすでにその id の行が存在します。重複を削除してください |
| インストール後に日付が出ない | ① `dsh-date-wrapper` が `dsh.profile.bundles` にあることを確認する。② 再起動してページを更新したことを確認する。③ **現在のプリセットが固定プロンプトのものでないことを確認する**（次の行） |
| 一部のプリセットで日付が出ない | そのプリセットのペルソナが `includeRuntimeContext: false` を設定しています（公式の `minimal` とローカルの `simple-reply` の両方がそう）。このようなプリセットは、後続のリスナーがプロンプト内容を追加することを明示的に禁止しているため、このプラグインのランタイムコンテキストは破棄されます — 想定どおりの挙動です |
| 日付が 1 日ずれる | `timeZone` が実際のゾーンと一致していません。ゾーン境界をまたぐと（例: 北京時間 00:30 = 前日 16:30 UTC）1 日の差として現れます |
| `Time sampled …` も表示される | 何らかのプリセットが `@deepseek-ai/dsh-time-context` を明示的にマウントしています。このプラグインはそれを読み込まず、フィルタもしません。両者は併用すべきではありません |

## 5. オン/オフ（パネルのトグルなし — 有効化そのものがスイッチ）

自分のプロファイルパッチレイヤー — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml` — で無効化・有効化します:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **ホット、再起動不要**: このファイルは Cordis HMR が監視しており、`disabled: true` はその行の fiber を破棄し、注入は即座に停止します。
- DSH 組み込みの **Settings → Plugins** ページは `enabled / disabled` を表示します（読み取り専用）。
- ファイルはトップレベルの YAML 配列でなければなりません。形式を崩すと**起動に失敗します**（fail-loud）。
- 完全な削除は `dsh plugin remove` を経由し（次のセクション）、**再起動が必要**です。

## 6. アンインストール

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

dsh web を再起動してください。
