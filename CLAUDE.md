# FocusLap — CLAUDE.md

## プロジェクト概要

集中すると魚が増えるポモドーロ式タスク管理PWA（React + Vite）。
Firebase Auth で Google / メール+パスワード ログイン、Firestore でユーザーごとにデータ保存。
Firebase 未設定時はゲストモード（localStorage）でも動作する。
本番は Vercel（main への push で自動デプロイ）: https://focuslap-iggi.vercel.app

---

## コマンド

```bash
npm install                  # 初回セットアップ
npm run dev                  # 開発サーバー（ポート5173）
npm run build                # dist/ にビルド
npm run preview              # ビルド後プレビュー
npm test                     # vitest（shared.jsx のコアロジック単体テスト）
node scripts/make-icons.mjs  # icon.svg から PNG アイコンを再生成（sharp使用）
```

---

## ディレクトリ構成

```
src/
  main.jsx              # エントリーポイント / SW登録（PRODのみ）
  App.jsx               # ルート：Auth・データ管理・タブ切替・設定/ヘルプシート・通知スケジューラ
  firebase.js           # Firebase初期化（env未設定時は無効化）
  storage.js            # Firestore or localStorage の透過ラッパー
  shared.jsx            # デザイントークン・FISHES・日付/繰り返しヘルパー・TaskForm/TaskRow等
  shared.test.js        # 上記コアロジックのvitest単体テスト（fishForMinutes/nextRepeatDate等）
  fish.jsx              # オリジナル魚SVG（11種・FishSVGコンポーネント）
  icons.jsx             # タブナビ用の海テイスト線画アイコン5種
  push.js               # Web Push購読（enablePush / disablePush）
  auth/LoginScreen.jsx  # Google / メール+パスワード ログイン・新規登録・再設定 / ゲスト選択
  tabs/
    FocusTab.jsx        # タイマー・魚獲得演出・離脱判定・手動記録・各モード設定
    TasksTab.jsx        # タスク一覧・リマインド/プッシュ通知トグル
    CalendarTab.jsx     # 月/週/日カレンダー・既存タスク割り振り（移動/コピー）
    GoalsTab.jsx        # 長期目標・仕事プロジェクト・目標別の集中時間/魚集計
    TankTab.jsx         # 水槽・魚図鑑（中央配置）・スポットライト・完了タスクの振り返りメモ
public/
  sw.js                 # Service Worker（キャッシュ＋push受信＋通知クリック）
  manifest.webmanifest  # PWAマニフェスト
  icon.svg / icon-{180,192,512}.png
scripts/
  send-push.mjs         # プッシュ通知送信（GitHub Actionsから実行）
  make-icons.mjs        # SVG→PNGアイコン生成
.github/workflows/
  push-notify.yml       # 5分ごとの通知cron＋keepalive（公式API直呼び）
```

---

## データモデル（Firestore: `users/{uid}/data/main` の payload）

```ts
{
  goals:    Goal[]
  tasks:    Task[]
  sessions: Session[]
  settings: {
    work: number; rest: number;
    phoneMode: boolean;       // 他アプリ使用中も魚が逃げない
    autoRepeat: boolean;      // 休憩後に自動で次の集中を開始
    hourlyReminder: boolean;  // 期限リマインド（期限が今日/過去の未完了を1時間ごと通知）
    timerKind: "timer" | "stopwatch";  // ポモドーロ / カウントアップ計測
  }
  collection: { [fishEmoji: string]: number }  // 魚ごとの獲得数
  escapes: number; escapesDate: string         // 逃げた魚（日ごとにリセット）
  memos: { [taskId: string]: string }          // 完了タスクの振り返りメモ
  pendingSession?: { endAt: number; minutes: number }  // 実行中タイマーの終了予定（push用）
  archive: ArchiveEntry[]  // 完了タスクの永久記録（タスク/目標を削除しても残る）
  shareId?: string         // カレンダー閲覧リンクのID（発行中のみ）
  groups: { id: string, name: string }[]  // 参加中のグループ
}

ArchiveEntry = { id /* 元taskId */, title, goalTitle: string|null, goalType: "goal"|"work"|null,
                 due: string|null, completedAt: string, sessions: number, fish: string|null }

Goal    = { id, title, date: string|null, type: "goal"|"work" }
Task    = { id, title, goalId: string|null, due: string|null,
            startTime: string|null /* "HH:MM" */, done: boolean, note?: string,
            kind?: "event" /* 予定（カレンダー専用・完了なし・開始通知のみ対象） */,
            progress?: number /* 0-100の進捗。100でdone */, progressNote?: string /* 引き継ぎメモ */,
            repeat?: "daily"|"weekly"|"biweekly"|"monthly"|"bimonthly"|null,
            repeatUntil?: string|null /* 繰り返しの最終日（事前生成の終端） */,
            repeatGroup?: string /* 事前生成された系列の共通id（完了時に次回生成しない目印） */,
            nextId?: string /* 最終日なし繰り返しで自動作成した次回分のid（チェック取消時の掃除用） */ }
Session = { date: string, minutes: number, taskId: string|null, fish: string,
            manual?: true /* あとから記録 */, stopwatch?: true /* ストップウォッチ計測 */ }
```

その他のFirestoreコレクション：
- `users/{uid}/push/{key}` — Web Push購読情報（subのJSON文字列）
- `users/{uid}/pushMeta/state` — 送信済みキー sent（重複防止）と lastDue（期限リマインドのthrottle）

### マイグレーション
`App.jsx: migrateData()` がロード時に旧形式変換・新フィールド補完・escapesの日次リセット・
既存完了タスクのarchiveバックフィルを行う。**新フィールド追加時は必ずここに追記する。**

### 繰り返しタスク
- `shared.jsx: REPEATS / nextRepeatDate() / repeatDates()`。月またぎは月末に丸める
- **最終日あり**：`repeatDates()` で初回〜最終日の全回分を事前生成（`repeatGroup`付き）。カレンダーに全部並ぶ。完了しても増殖しない
- **最終日なし**：従来の「完了したら次回1件を生成」方式。完了側に `nextId` を記録し、チェック取消で未着手の次回分を削除
- 完了時の自動生成は `x.repeat && !x.repeatGroup` のときのみ（repeatUntilがあれば次回dateがそれを超えたら停止）

### 通知（期限リマインド）
- `settings.hourlyReminder` ON時、期限が今日or過去の未完了タスクを**1時間ごと**通知（8〜22時）
- 旧「未完了N件すべて」を対象にする方式は廃止し、期限ベースに絞った
- throttleはタイムスタンプ：アプリ内 `focuslap:lastDueReminder` / pushは `pushMeta/state.lastDue`

### 予定（kind: "event"）
- カレンダーの「🕐 予定」欄から追加する軽量エントリ（tasks配列に同居）。時刻＋タイトルのみ
- タスク一覧・集中タブの選択肢・目標集計・期限リマインド・アーカイブからは**除外**
- 開始5分前通知は既存のstartTime通知に乗る（文言だけ「🕐 まもなく予定」に分岐）
- 除外フィルタは `t.kind !== "event"` で統一（TasksTab/FocusTab/CalendarTab割り振り/通知2箇所）

### カレンダーの既存タスク割り振り（CalendarTab）
- 選択日のプルダウンから既存タスクを「**この日へ移動**」（dueを変更）or「**＋この日にコピー**」（同タスクを複製して別日にも配置）
- プルダウンは `assignableTasks` で**同名タスクを1件に重複排除**（過去のコピーで増えても選択肢は膨らまない）
- 割り振り時にstartTimeは設定しない（コピーは `startTime: null`）。時刻はTaskRowの✎編集で後から設定する方針

### タスクの進捗（引き継ぎ式）
- `shared.jsx: ProgressSheet` — 5%刻みで進捗を積み上げ、引き継ぎメモ（progressNote）を残せる
- セッション完了後（非autoRepeat／ストップウォッチ）に自動表示。TaskRowの📊ボタンでいつでも開ける
- 100%で `applyTaskDone()` を呼び自動完了。FocusTabのタスク選択時に前回の進捗とメモを表示

### アーカイブの仕組み
- 完了処理は `shared.jsx: applyTaskDone(d, taskId, done)` に集約（チェックボックス・進捗100%・編集が共用）。
  完了時にarchiveへ追加（目標名・タイプを焼き込むため目標削除後も表示可能）、繰り返しの次回生成もここ
- チェックOFFで該当エントリ削除（メモは残る）
- TankTabの振り返りはarchiveを表示する。タスク本体を×で削除しても記録とメモは消えない
- 手動削除：カードの🗑で記録＋メモを削除（confirm付き）、メモ編集内の「🗑 メモを削除」でメモのみ削除

### カレンダー共有
- **閲覧リンク**：`shares/{shareId}` に `{owner, ownerName, updatedAt, items[]}` を保存。
  `?share=ID` で `SharedCalendarPage`（ログイン不要・読み取りは誰でも可＝IDが秘密）
- **グループ**：`groups/{gid}`（name等）＋ `members/{uid}` ＋ `calendars/{uid}` ＋ `events/{eventId}`。
  `?group=ID` で `GroupCalendarPage`（要ログイン・メンバーのみ読める。メンバー色分け表示）
- **グループ共有の予定**（`events`）：CalendarTabのグループ表示中に追加できる全員向け予定。
  金色（GROUP_EV_COLOR）で表示、削除は作成者のみ（`createdBy === myUid` でUI制御＋ルールで強制）。
  ドキュメント形：{ id, title, due, startTime, createdBy, createdByName, createdAt }
- items は `App.jsx: calendarItems()` が生成（title/due/startTime/kind/done のみ。魚・メモは含めない）
- 同期は保存エフェクト内（400msデバウンス＋JSON比較で変化時のみ書き込み）
- 参加/作成/退出は⚙️設定のSettingsSheet。参加中リストは payload の `groups` に保持
- ルーティングは `main.jsx` がURLクエリで分岐（アプリ本体を経由しない独立ページ）
- **予定タブ内でもグループ表示可**：CalendarTab上部の切替チップで自分↔グループを選択。
  グループ選択時は `loadGroupData` で全メンバーのカレンダー＋グループ予定を読み、
  上＝グループの予定入力＋他メンバー一覧（自分の分はライブの data.tasks から合成）、
  下＝自分の編集エリア（常時表示・追加すると自動でグループにも共有）。`myUid`/`myName` propで自分を判定
- 予定の「終日」：CalendarTabの `evAllday` トグル。ONで時刻入力を隠し startTime:null で保存

### セキュリティルール
`users/{userId}/**` は `request.auth.uid == userId` のみ読み書き可。
`shares/{id}` は read全許可・writeはowner一致のみ。`groups` はメンバーのみread、
members/{uid}・calendars/{uid} は本人のみwrite（詳細はFirestoreコンソールのルール参照）。
GitHub Actions の Admin SDK はルールをバイパスする。

---

## 魚システムとネタバレ防止

- `shared.jsx: FISHES` — 11種類。`minutes` フィールド＝獲得に必要なセッション分数（5分🫧〜120分🦕）
- `fishForMinutes(min)` — セッション分数 → 獲得魚
- 見た目は絵文字ではなく `fish.jsx: FishSVG`（フラット積み木調・全員左向き、反転はscaleX(-1)）
- データ上のIDは絵文字のまま（互換性維持）

**ネタバレ防止ポリシー：未獲得（collection数0）の魚は名前「？？？」＋シルエット表示。**
適用箇所＝時間選択カード / タイマー水槽 / 「このセッションで獲得」 / あとから記録プレビュー / 図鑑 / スポットライト。獲得演出（Celebration）で初公開される。
プッシュ通知の文面にも魚名を入れない。

---

## タイマー仕様（FocusTab）

- **実時間基準**：`endAtRef`（終了予定時刻）との差分で残り秒を計算。バックグラウンドでも狂わない
- **離脱判定**：visibilitychange監視。1分以内の離脱・画面スリープはセーフ。
  1分超で戻ったら escape（ただし離脱中にタイマー満了していれば獲得扱い／phoneMode中は常にセーフ）
- **autoRepeat**：完了時に running を維持し `endAtRef` を直接更新して次セッションへ
- **escapes** は日ごとにリセット（escapesDate で管理）
- 完了時：chime（和音）＋Celebration オーバーレイ（紙吹雪・通算n匹目）＋Notification
- タスク選択は optgroup でグループ化（今日やる→目標ごと→その他）。タスク選択時に note（今回やることメモ）を編集可

### ストップウォッチモード（settings.timerKind === "stopwatch"）
- カウントアップ計測。「終了して記録」を押した時点の分数で `fishForMinutes` の魚を獲得（5分未満は記録不可）
- **常にスマホ学習モード扱い**：離脱・スリープでも魚は逃げず、計測も止まらない（タイムスタンプ基準）
- 1分超の計測をリセット（破棄）すると escape 扱い
- pendingSession（終了push）はポモドーロ専用。実行中はタイマー種別の切替不可

---

## 通知アーキテクチャ

**アプリ起動中**（App.jsx の30秒間隔スケジューラ）：
- タスク開始時刻（due=今日 && startTime）の5分前に Notification
- hourlyReminder ON なら未完了件数を1時間ごとに通知
- 送信済みフラグは localStorage（`focuslap:ntf:*` / `focuslap:lastHourly`）

**アプリを閉じていても届くWeb Push**：
- 購読：`push.js enablePush()` → VAPID公開鍵で subscribe → Firestoreに保存。⚙️設定/タスクタブ/初回バナーから有効化
- 受信：`sw.js` の push ハンドラ（**アプリが可視状態のときは表示せず**アプリ内通知に譲る）
- 送信：`.github/workflows/push-notify.yml` → `scripts/send-push.mjs`
  - **起動はcron-job.orgが担当**：GitHubのcron（*/5）は数時間飛ぶことがあり信頼できないため、
    cron-job.org が5分ごとに workflow_dispatch API を POST して起動する
    （認証は fine-grained PAT `focuslap-cron`／Actions: Read and write／無期限）
  - ①開始時刻の10分前〜定刻 ②hourlyリマインド（8〜22時） ③pendingSession による集中終了通知（終了後3時間以内）
  - 重複防止は `pushMeta/state`、無効購読（404/410）は自動削除
  - keepaliveステップが公式API（workflow enable）で60日自動停止を防ぐ
- **制約**：通知は最大5〜8分遅れる（5分間隔チェックのため）。iOSはホーム画面に追加したPWAのみpush可

GitHub Secrets: `FIREBASE_SERVICE_ACCOUNT` / `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`

---

## デザイン

### トークン（`shared.jsx: C`）
| 変数 | 値 | 用途 |
|---|---|---|
| ink | #0A2238 | 本文 |
| aqua | #14A3A1 | アクセント |
| deepAqua | #0E7C7B | 強調・アクティブ |
| yellow | #F5BE3D | 達成・バッジ |
| deck | #F2F7F7 | （旧背景・現在はグラデ） |
| card | #FFFFFF | カード |
| line | #DCE8E8 | ボーダー |
| sub | #5B7283 | サブテキスト |
| red | #E05B5B | 警告・期限超過 |

### 水中の世界観
- 背景：水面→深海のグラデーション＋ゆっくり浮かぶ泡（floatUp、fixed・pointerEvents:none）
- ナビ：すりガラス（backdrop-filter）＋`icons.jsx` の線画アイコン、アクティブはアクア楕円
- 図鑑・スポットライトは深海ネイビーのパネル。図鑑は獲得魚が中央配置（中心距離ソート）
- `document.hidden` 時は `.app-paused` クラスで全CSSアニメーション停止（省電力）
- ボトムシート（ヘルプ/設定/進捗）は共通クラス `.sheet`（App.jsxの<style>で定義：85dvh・
  タッチスクロール・overscroll-behavior）＋ safe-area-inset-bottom のpadding。ナビも safe-area 対応

各タブの「?」ボタン → `App.jsx: HELP` の使い方説明。**機能を追加・変更したら HELP も更新すること。**

---

## 環境変数

`.env.local`（Vercelにも同じものを設定）:
```
VITE_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID
VITE_VAPID_PUBLIC_KEY   # Web Push用（npx web-push generate-vapid-keys）
```
未設定でもゲストモードで動作する。

---

## デプロイ・運用

- `git push origin main` → Vercelが自動デプロイ
- ビルドは `vite.config.js` の manualChunks で firebase / react を別チャンクに分離（更新時のキャッシュ効率化）。
  非デフォルトのタブ（Tasks/Calendar/Goals/Tank）は `App.jsx` で `lazy()` 遅延ロード
- コアロジックを変更したら `npm test` で `shared.test.js` を通すこと
- アイコン変更時は `node scripts/make-icons.mjs` でPNGも再生成してコミット
- サービス全体像・トラブル対応・バックアップ一覧は `OPERATIONS.md` を参照（ユーザー向け運用ガイド）
- Firestoreルールは本番設定済み（無期限）。OAuth同意画面は本番公開済み
- Firebase Auth は Google と メール/パスワード の2プロバイダを有効化済み
- Google Calendar 連携は廃止済み（googleCalendar.js は削除した）
