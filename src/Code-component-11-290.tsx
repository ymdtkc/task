# npm用セットアップ手順

このプロジェクトをnpm/Node.js/Vite環境で実行するためのセットアップ手順です。

## 必要なファイル構造

プロジェクトは以下の構造になっている必要があります：

```
task-management-app/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── README.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   └── globals.css
│   └── components/
│       ├── TaskForm.tsx
│       ├── TaskList.tsx
│       ├── TaskMatrix.tsx
│       ├── TodaysTasks.tsx
│       ├── TaskItem.tsx
│       ├── DraggableTaskItem.tsx
│       ├── figma/
│       │   └── ImageWithFallback.tsx
│       └── ui/
│           ├── accordion.tsx
│           ├── alert-dialog.tsx
│           ├── alert.tsx
│           └── (その他shadcn/uiコンポーネント)
```

## セットアップ手順

### 1. 既存ファイルの移動

現在のファイル構造から、以下のファイルを `src/` ディレクトリ内に移動してください：

**componentsディレクトリ全体を移動:**
```bash
# 現在の /components を /src/components に移動
mv components src/components
```

**stylesディレクトリを移動:**
```bash
# 現在の /styles を /src/styles に移動  
mv styles src/styles
```

**App.tsxを移動:**
```bash
# 現在の /App.tsx を /src/App.tsx に移動
cp App.tsx src/App.tsx
```

### 2. 必要なファイルの作成

以下のファイルが作成されています：
- ✅ `package.json` - 依存関係とスクリプト
- ✅ `vite.config.ts` - Viteの設定
- ✅ `tsconfig.json` - TypeScriptの設定  
- ✅ `tsconfig.node.json` - Node.js用TypeScript設定
- ✅ `index.html` - HTMLエントリーポイント
- ✅ `src/main.tsx` - Reactエントリーポイント
- ✅ `src/App.tsx` - メインアプリケーション
- ✅ `src/styles/globals.css` - グローバルスタイル
- ✅ `README.md` - プロジェクトドキュメント

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. ブラウザでアクセス

`http://localhost:5173` でアプリケーションが利用できます。

## トラブルシューティング

### ファイルが見つからないエラーの場合

1. `src/components/` 内に全てのコンポーネントファイルがあることを確認
2. `src/styles/globals.css` が存在することを確認
3. ファイルパスが正しいことを確認

### TypeScriptエラーの場合

1. 全ての依存関係がインストールされていることを確認
2. `tsconfig.json` の設定が正しいことを確認

### Viteエラーの場合

1. `vite.config.ts` の設定を確認
2. `index.html` が正しい場所にあることを確認

## プロダクションビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに生成されます。

## 含まれる機能

✅ タスクの追加・編集・削除  
✅ 重要度・緊急度・完了時間の設定  
✅ アイゼンハワーマトリクス表示  
✅ ドラッグ&ドロップでのタスク移動  
✅ 今日のタスク管理  
✅ ローカルストレージでのデータ永続化  
✅ レスポンシブデザイン  
✅ トースト通知  

このプロジェクトは完全にnpm環境で動作し、本格的なタスク管理アプリケーションとして使用できます！