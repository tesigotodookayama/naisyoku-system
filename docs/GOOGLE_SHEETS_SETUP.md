# Google Sheets API 連携手順

**通常の利用では不要です。** このアプリは見本データ（ローカルの `data/db.json`）だけで一通り動けます。スプレッドシート連携は任意です。

本番で Google スプレッドシートをデータベースとして使う場合のみ、以下を設定してください。サービスアカウントの JSON や秘密鍵はリポジトリに置かないでください。

## 1. Google Cloud プロジェクトの作成

1.  [Google Cloud Console](https://console.cloud.google.com/) にアクセスします。
2.  プロジェクトの選択（または新規作成）から、新しいプロジェクト（例：`Naisyoku-System`）を作成します。

## 2. API の有効化

1.  メニューの「API とサービス」 > 「ライブラリ」を選択します。
2.  **「Google Sheets API」** を検索し、「有効にする」をクリックします。

## 3. サービスアカウントの作成と鍵の取得

1.  メニューの「API とサービス」 > 「認証情報」を選択します。
2.  「認証情報を作成」 > **「サービスアカウント」** をクリックします。
3.  名前を入力して「完了」をクリックします（権限の付与は不要です）。
4.  作成されたサービスアカウントのリストから、該当するアカウントのメールアドレスをクリックします。
5.  「キー（Keys）」タブを選択し、「鍵を追加」 > **「新しい鍵を作成」** をクリックします。
6.  **JSON** を選択して「作成」をクリックすると、鍵ファイルがダウンロードされます。

## 4. 環境変数の設定

ダウンロードした JSON ファイルの内容をもとに、Vercel の管理画面または `.env.local` に以下の値を設定してください。

*   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: JSON の `client_email` の値
*   `GOOGLE_PRIVATE_KEY`: JSON の `private_key` の値
    *   **注意**: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` という形式をすべてコピーしてください。
*   `GOOGLE_SHEET_ID`: スプレッドシートの URL に含まれる ID
    *   例: `https://docs.google.com/spreadsheets/d/XXXXXXXXXX/edit` の `XXXXXXXXXX` の部分

## 5. スプレッドシートの共有

1.  使用する Google スプレッドシートを開きます。
2.  右上の「共有」ボタンをクリックします。
3.  上記の手順 3-4 で取得した **サービスアカウントのメールアドレス** を入力し、**「編集者」** 権限で共有（招待）してください。

---

## スプレッドシートのデータ構造（推奨）

各シート（タブ）の 1 行目には以下のヘッダー（項目名）を設定してください。

### `Clients` シート
`id`, `name`, `contact`, `tel`, `ongoingProjects`

### `Staff` シート
`id`, `name`, `tel`, `address`, `status`

### `Projects` シート
`id`, `name`, `client`, `deadline`, `status`, `difficulty`
