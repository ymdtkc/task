# タスク管理ツール

タスク一覧・今日のタスク・3×3マトリクスを備えた個人向けタスク管理ツールです。

## 主な機能

- タスクの追加、編集、完了、削除
- 今日のタスク
- 重要度×緊急度のマトリクスとドラッグ移動
- JSON形式のバックアップと復元
- Googleアカウントによる開始・ログイン
- ログイン中の端末間データ同期
- 「誰に」「話したいこと」「重要度」の3項目で残せる会話メモ

## 開発画面を起動する

1. npm install --no-package-lock
2. npm run dev

## Supabaseの設定

1. Supabaseの「SQL Editor」で、次のSQLを番号順に実行します。
   - supabase/migrations/001_create_tasks_table.sql
   - supabase/migrations/002_add_talk_memos.sql
   - supabase/migrations/003_soft_delete_tasks.sql
2. 「Authentication」→「Providers」でGoogleだけを有効にし、Emailなどほかの認証方式とAnonymous sign-insを無効にします。初めての人も利用できるよう、`Allow new users to sign up` は有効のままにします。
   - 新しいSupabaseプロジェクトでは、Google Client ID・Client SecretとSupabaseのcallback URLの設定も必要です。[Supabase公式手順](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. 「Authentication」→「URL Configuration」で次を設定します。
   - Site URL: https://www.endlesstask.com
   - Redirect URLs: https://www.endlesstask.com/**
4. Vercelに次の環境変数を設定します。
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

## 初めて利用する方

専用のサインアップ画面はありません。

1. 「Googleで続ける」を押します。
2. 利用するGoogleアカウントを選びます。
3. 初回は利用者登録が自動で行われ、そのまま利用を開始できます。

タスクと会話メモはGoogleアカウントごとに分かれ、ほかの利用者からは見えません。

## 公開用ビルド

npm run build

