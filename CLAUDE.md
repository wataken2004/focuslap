# FocusLap — CLAUDE.md

## プロジェクト概要

集中すると魚が育つポモドーロ式タスク管理PWA（React + Vite）。
Firebase Auth で Googleログイン、Firestore でユーザーごとにデータを保存。
Firebase 未設定時はゲストモード（localStorage）でも動作する。

---

## コマンド

```bash
npm install      # 初回セットアップ
npm run dev      # 開発サーバー
npm run build    # dist/ にビルド
npm run preview  # ビルド後プレビュー
```

---

## ディレクトリ構成

```
src/
  main.jsx              # エントリーポイント / SW登録
  App.jsx               # ルート：Auth・データ管理・タブ切替
  firebase.js           # Firebase初期化（env未設定時は無効化）
  storage.js            # Firestore or localStorage の透過ラッパー
  shared.jsx            # デザイントークン・FISHES・共有コンポーネント
  googleCalendar.js     # Google Calendar REST API ラッパー
  auth/
    LoginScreen.jsx     # Googleログイン / ゲスト選択画面
  tabs/
    FocusTab.jsx        # ポモドーロタイマー・魚獲得・アプリ切替検知
    TasksTab.jsx        # タスク一覧・フィルター
    CalendarTab.jsx     # 月/週/日カレンダー・Googleカレンダー同期
    GoalsTab.jsx        # 長期目標・仕事プロジェクト
    TankTab.jsx         # 水槽・魚ずかん・統計
public/
  sw.js                 # Service Worker
  manifest.webmanifest
.env.example            # Firebase環境変数のテンプレート
```

---

## データモデル（Firestore: `users/{uid}/data/main` の payload）

```ts
{
  goals:    Goal[]
  tasks:    Task[]
  sessions: Session[]
  settings: { work: number; rest: number }
  collection: { [fishEmoji: string]: number }  // 獲得数
  escapes:  number
}

Goal    = { id, title, date: string|null, type: "goal"|"work" }
Task    = { id, title, goalId: string|null, due: string|null, done: boolean }
Session = { date: string, minutes: number, taskId: string|null, fish: string }
```

### マイグレーション
`App.jsx: migrateData()` で旧形式（collection が配列）を自動変換。
新フィールド追加時はここに追記する。

---

## 魚システム

- `shared.jsx: FISHES` — 11種類、minutes フィールドで獲得に必要なセッション時間を定義
- `fishForMinutes(min)` — セッション分数 → 獲得魚を返す
- FocusTab がセッション完了時に `collection[fish.e] += 1`
- Task には fish フィールドなし（最後のセッションの魚を表示）

---

## アプリ切り替え検知

`FocusTab.jsx` 内で `document.visibilitychange` を監視。
タイマー動作中にタブ/アプリを離れると即座にタイマー停止・バナー表示。

---

## Googleカレンダー連携

- Firebaseログイン時に `calendar.events` スコープを要求
- アクセストークンを `sessionStorage: "focuslap:gat"` にキャッシュ
- `googleCalendar.js`: `listCalendarEvents` / `createCalendarEvent`
- CalendarTab の同期トグルでON/OFF切替

---

## デザイントークン（`shared.jsx: C`）

| 変数 | 値 | 用途 |
|---|---|---|
| ink | #0A2238 | 本文 |
| aqua | #14A3A1 | アクセント |
| deepAqua | #0E7C7B | 強調・アクティブ |
| yellow | #F5BE3D | 達成・バナー |
| deck | #F2F7F7 | 背景 |
| card | #FFFFFF | カード |
| line | #DCE8E8 | ボーダー |
| sub | #5B7283 | サブテキスト |
| red | #E05B5B | 警告・期限超過 |

---

## 環境変数（`.env.local`）

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

未設定でも動作する（ゲストモード＋localStorage）。

---

## GitHubへのデプロイ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/ユーザー名/focuslap.git
git push -u origin main
```

GitHub Pages の場合は `vite.config.js` の `base` をリポジトリ名に変更：
```js
base: "/focuslap/",
```
