# English Dialogue

英会話スクリプト（2人の対話）から、AI音声合成（[`kokoro-js`](https://www.npmjs.com/package/kokoro-js)）で**ネイティブ音声を自動生成**し、テキストと連動してリスニング・シャドーイング学習ができる自分専用の Web アプリです。

- 音声生成は**ローカルの CLI** で完結（完全無料・オフライン）
- 生成物（音声 MP3 ＋ レッスンメタデータ）は**リポジトリ内のファイル**として管理（DB・外部ストレージ不要）
- Web アプリは生成物を読み込み、レッスンページを**静的生成（SSG）**

> 詳細仕様は [`REQUIREMENTS.md`](./REQUIREMENTS.md)、実装チェックリストは [`DESIGN_CHECKLIST.md`](./DESIGN_CHECKLIST.md) を参照。

---

## 必要環境

- **Node.js v18 以上**（`.nvmrc` は v24 を指定）
- 追加のシステムインストールは不要。MP3 エンコードは `ffmpeg-static` に同梱の ffmpeg を使用します。

```bash
npm install
```

> 初回の `npm run generate` 実行時、kokoro-js が TTS モデル（onnx-community/Kokoro-82M-v1.0-ONNX）を Hugging Face から自動ダウンロードしてキャッシュします（要ネットワーク・初回のみ）。

---

## 使い方

### 1. 入力 JSON を配置する

`content/input/` にレッスンごとの JSON ファイルを置きます（フォーマットは後述）。

```
content/input/
  01-at-the-cafe.json
  02-at-the-airport.json
```

- **ファイル名がスラッグ（URL・並び順）になります**。`.json` を除いた文字列がそのまま使われ、自動変換はされません。
- スペースや記号を含めず、`01-`, `02-` のような連番にすると一覧の表示順を制御できます（slug 昇順で並びます）。

### 2. 音声を生成する

```bash
npm run generate
```

- `content/input/` の全 JSON を**検証**してから、各行を 1 つずつ音声化します。
- 出力先:
  - 音声: `public/audio/<slug>/<turn_id>.mp3`
  - メタデータ: `content/lessons/<slug>.json`
- **差分生成**: 2 回目以降は、変更/新規/音声欠落の行だけを再生成し、変更のない行はスキップします（高速）。
- **クリーンアップ**: 入力から削除した行・レッスンに対応する音声/メタデータは自動削除されます。

全行を強制的に作り直す場合:

```bash
npm run generate -- --force
```

### 3. 生成物をコミットする

```bash
git add content/ public/audio/
git commit -m "Add lessons"
```

入力 JSON と生成物の両方をバージョン管理することで、任意の環境でビルド・デプロイが完全に再現できます。

### 4. アプリを起動する

```bash
# 開発
npm run dev

# 本番ビルド & 起動
npm run build
npm run start
```

ブラウザで <http://localhost:3000> を開きます。

---

## 入力 JSON フォーマット

`content/input/<slug>.json`:

```json
{
  "title": "At the Cafe",
  "description": "Ordering a coffee and a pastry.",
  "category": "Daily Conversation",
  "turns": [
    {
      "turn_id": 1,
      "speaker": "Alice",
      "voice_setting": "af_bella",
      "text": "Hello! I'd like a double espresso, please.",
      "translation": "こんにちは！ダブルのエスプレッソをください。"
    },
    {
      "turn_id": 2,
      "speaker": "Bob",
      "voice_setting": "am_adam",
      "text": "Sure thing! Would you like anything else with that?",
      "translation": "かしこまりました！ご一緒にいかがですか？"
    }
  ]
}
```

### フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | string | ✓ | レッスンのタイトル |
| `description` | string | ✓ | レッスンの説明（空文字可） |
| `category` | string | ✓ | カテゴリ。一覧画面のフィルターに使用 |
| `turns` | array | ✓ | 発言の配列（1 件以上） |
| `turns[].turn_id` | number | ✓ | 行の識別番号。レッスン内で**重複不可** |
| `turns[].speaker` | string | ✓ | 話者名。**1 レッスンにつき最大 2 人** |
| `turns[].voice_setting` | string | ✓ | kokoro-js のボイス名（下記参照） |
| `turns[].text` | string | ✓ | 読み上げる英文 |
| `turns[].translation` | string | ✓ | 日本語訳（空文字可。表示モードで切替） |

### バリデーション規則（生成前にチェック・違反時は中断）

`npm run generate` は音声を作る前に全ファイルを検証し、問題があれば**ファイル名・ターン番号**を示してエラー終了します（不正なまま出力しません）。

- 必須フィールドの欠落・型不一致
- `turn_id` の重複
- **話者が 3 種類以上**（2 人想定のためエラー）
- **話者名の表記ゆれ**（大文字小文字や前後の空白だけが異なる `"Alice"` と `"alice"`、`"Bob "` と `"Bob"` などの混在）。自動補正はせず、名称統一を促します
- `voice_setting` が未対応のボイス名

### 表示上の挙動メモ

- **左右配置**: レッスン内で最初に登場した話者が左、もう一方が右に固定されます。同じ話者が連続して話しても同じ側に並びます。話者が 1 人のみ（モノローグ）の場合は全行が左になります。
- **音声ハッシュ**: 各行の `text` ＋ `voice_setting` からハッシュを算出し、差分生成の判定とブラウザキャッシュの無効化（`?v=<hash>`）に使います。`text` または `voice_setting` を変更した行だけが作り直され、ブラウザも新しい音声を取得します。

---

## ボイス（`voice_setting`）

`voice_setting` には kokoro-js が対応するボイス名を指定します。先頭の文字が言語/性別を表します（`af_`＝American Female、`am_`＝American Male、`bf_`/`bm_`＝British など）。

アメリカ英語の代表例:

| ボイス名 | 種別 |
|---|---|
| `af_heart` | 女性（総合評価 A） |
| `af_bella` | 女性 |
| `af_nicole` | 女性 |
| `am_adam` | 男性 |
| `am_michael` | 男性 |
| `am_fenrir` | 男性 |

> 利用可能な全ボイスは `node_modules/kokoro-js/voices/` のファイル名（`<voice>.bin`）で確認できます。各ボイスの音質グレードは [kokoro-js の README](https://www.npmjs.com/package/kokoro-js) を参照してください。

---

## 学習画面の操作

- **全体再生** / 一時停止: 画面下部の再生ボタン（または `Space` キー）
- **行タップ**: その行から連続再生。同じ行を再タップすると先頭から再生し直し（リピート兼用）
- **再生速度**: `0.5×` / `0.75×` / `1.0×` / `1.25×`
- **表示モード**: 「英文のみ」⇄「英文＋日本語訳」をトグル（初期は英文のみ）
- **キーボード**: `Space`＝再生/一時停止、`→`＝次の行、`←`＝現在の行を頭出し

表示モード・再生速度・カテゴリフィルターの選択は `localStorage` に保存され、再訪時も維持されます。

---

## ディレクトリ構成

```
content/
  input/                  # 入力 JSON（手動で配置）
  lessons/                # 生成済みレッスンメタデータ（自動生成）
public/
  audio/<slug>/<id>.mp3   # 生成済み音声（自動生成）
scripts/
  generate.ts             # 音声生成 CLI
src/
  app/                    # Next.js App Router（一覧 / 個別 / 404）
  components/             # UI（ブラウザ・プレイヤー・shadcn 風プリミティブ）
  lib/                    # レッスン読込・ユーティリティ
  types/                  # データモデル型
```

---

## スクリプト

| コマンド | 説明 |
|---|---|
| `npm run generate` | 入力 JSON から音声・メタデータを生成（差分） |
| `npm run generate -- --force` | 全行を強制再生成 |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（レッスンページを SSG） |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint |

---

## 技術スタック

Next.js (App Router) / React / Tailwind CSS v4 / shadcn 流コンポーネント / kokoro-js（TTS）/ ffmpeg-static（MP3 エンコード）
