# 完全なnpm用セットアップ - 最終手順

## 自動化された移行手順

**完全なnpm/Vite環境のためには、以下の手順で一括移行してください：**

### 1. ディレクトリ作成と移動
```bash
# UIコンポーネントディレクトリを移動
cp -r components/ui src/components/
cp -r components/figma src/components/

# 重要な残りのコンポーネントを移動
cp components/*.tsx src/components/
```

### 2. 古いファイルの削除
```bash
# 古い構造のファイルを削除
rm -rf components/
rm -rf styles/
rm App.tsx
```

### 3. npm環境の起動
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## 完成したファイル構造

```
task-management-app/
├── package.json              ✅ 作成済み
├── vite.config.ts            ✅ 作成済み  
├── tsconfig.json             ✅ 作成済み
├── tsconfig.node.json        ✅ 作成済み
├── index.html                ✅ 作成済み
├── README.md                 ✅ 作成済み
├── src/
│   ├── main.tsx             ✅ 作成済み
│   ├── App.tsx              ✅ 作成済み
│   ├── styles/
│   │   └── globals.css      ✅ 作成済み
│   └── components/
│       ├── TaskForm.tsx     ✅ 作成済み
│       ├── TaskList.tsx     ✅ 作成済み
│       ├── TaskItem.tsx     ✅ 作成済み
│       ├── TaskMatrix.tsx   ✅ 作成済み
│       ├── DraggableTaskItem.tsx ✅ 作成済み
│       ├── TodaysTasks.tsx  ✅ 作成済み
│       ├── figma/           📋 コピー必要
│       │   └── ImageWithFallback.tsx
│       └── ui/              📋 コピー必要
│           ├── button.tsx
│           ├── card.tsx
│           ├── badge.tsx
│           └── (その他全shadcn/uiコンポーネント)
```

## 注意事項

**✅ 現在完成済み：**
- npm設定ファイル全て
- メインReactコンポーネント
- src/構造のApp.tsx
- グローバルCSS

**📋 手動コピー必要：**
- `components/ui/` ディレクトリ（全shadcn/uiコンポーネント）
- `components/figma/` ディレクトリ

## 現在の状況

**この状態でダウンロードすると：**
- ✅ npm設定は完全に準備済み
- ⚠️ 上記コピー手順（3分程度）が必要
- ✅ その後は完全なVite+React環境

**技術的制約について：**
Figma Makeの環境では、一度に大量のファイル操作を行うのに制限があるため、UIコンポーネントディレクトリの完全な自動移行は難しい状況です。しかし、上記の手順に従えば確実に完全なnpm環境が完成します。

## 利用可能なコマンド

```bash
npm run dev      # 開発サーバー（localhost:5173）
npm run build    # プロダクションビルド
npm run preview  # ビルド結果プレビュー
npm run lint     # ESLintチェック
```

この手順により、完全にCDNに依存しない、本格的なnpm/Node.js/Vite環境のタスク管理アプリケーションが完成します！