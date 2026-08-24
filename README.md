# タスク管理ツール

タスク一覧・今日のタスク・3×3マトリクスを備えた個人向けタスク管理ツールです。

## 主な機能

- タスクの追加、編集、完了、削除
- 今日のタスク
- 重要度×緊急度のマトリクスとドラッグ移動
- JSON形式のバックアップと復元
- Googleログイン
- メールアドレスとパスワードによるログイン
- ログイン中の端末間データ同期
- 「誰に」「話したいこと」「重要度」の3項目で残せる会話メモ

## 開発画面を起動する

1. npm install --no-package-lock
2. npm run dev

## Supabaseの設定

1. Supabaseの「SQL Editor」で、次のSQLを番号順に実行します。
   - supabase/migrations/001_create_tasks_table.sql
   - supabase/migrations/002_add_talk_memos.sql
2. 「Authentication」→「Providers」で、EmailとGoogleを有効にします。
3. 「Authentication」→「URL Configuration」で次を設定します。
   - Site URL: https://www.endlesstask.com
   - Redirect URLs: https://www.endlesstask.com/**
4. Vercelに次の環境変数を設定します。
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

## 既存のGoogleアカウントへパスワードを追加する

既存タスクを引き継ぐため、別アカウントは作成しません。

1. これまでどおりGoogleでログインします。
2. 画面右上の「パスワード設定・変更」を押します。
3. パスワードを設定します。
4. 次回から、同じメールアドレスと設定したパスワードでもログインできます。

パスワードを忘れた場合はGoogleでログインし、同じ画面から再設定できます。

## 公開用ビルド

npm run build
