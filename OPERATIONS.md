# FocusLap 運用ガイド

アプリを支えているサービスの全体像と、「永久に動かし続ける」ための知識をまとめたガイド。

---

## 使っているサービス一覧

### アプリ本体を支える4つ（メイン）

| ツール | 例えると | やっていること |
|---|---|---|
| **GitHub** | レシピ帳の保管庫 | アプリのコード（設計図）を保存する場所。修正はここにpushされる |
| **Vercel** | お店の店舗＋受付窓口 | GitHubのコードをWebサイトとして公開（`https://focuslap-iggi.vercel.app`）。タイマー開始時の「通知予約」も受け付ける（`api/schedule-push`） |
| **Firebase** | 顧客名簿と金庫 | ログイン管理（Google / メール+パスワード）と、ユーザーごとのデータ保存（タスク・魚・メモ・アーカイブ） |
| **cron-job.org** | 目覚まし時計 | 5分ごとに「通知チェックして！」とGitHubを起こす係 |

### 裏方の2つ

| ツール | 例えると | やっていること |
|---|---|---|
| **GitHub Actions** | 配達員 | ①予約を受けたら終了時刻まで待って集中終了を発送（`timer-push`） ②5分ごとに起こされたらFirebaseを確認して開始時刻・リマインドを発送（`push-notify`） |
| **Google Cloud Console** | 役所の窓口 | 「Googleでログイン」の許可証（OAuth）を発行している所 |

### 全体の流れ

```
開発：
  「直して」と依頼 → コード修正 → GitHubに保存
  → Vercelが自動で公開（1〜2分） → スマホで使える

通知①：集中終了（終了時刻ぴったり・数十秒以内）
  タイマー開始
  → アプリがVercelの api/schedule-push に「○時○分に終わる」と予約（ログイン確認あり）
  → GitHub Actions の timer-push が起動し、終了時刻まで待機
  → Firestoreでタイマーがまだ有効か確認（リセット済み・アプリで受取済みなら送らない）
  → Web Pushでスマホへ

通知②：開始時刻・期限リマインド（最大5〜8分遅れ）
  cron-job.org（5分ごと）
  → GitHub Actions の push-notify を起動
  → Firestoreを確認（開始時刻 / リマインド / ①が失敗した時の集中終了の予備）
  → Web Pushでスマホへ

スマホ側：
  通知ONで宛先（購読）をFirestoreに登録
  → 届いた通知は Service Worker（sw.js）が必ず画面に表示
  → アプリを開くたびに宛先を確認し、消えていれば自動で再登録
```

> 💡 iPhoneは「届いたのに表示しなかった通知」が続くと、そのアプリの通知を黙って止めてしまう。
> そのため sw.js はアプリ表示中でも必ず通知を出す（二重に見えることがあるのは仕様）。

---

## 永久保存の状態

| もの | 状態 | 条件・注意 |
|---|---|---|
| コード（GitHub） | ✅ 永久 | 削除しない限り消えない |
| アプリ公開（Vercel） | ✅ 永久 | 無料Hobbyプランのまま動き続ける |
| ユーザーデータ（Firestore） | ✅ 永久 | セキュリティルール本番設定済み（期限なし） |
| ログイン機能 | ✅ 永久 | OAuth同意画面は本番公開済み |
| 通知の定期実行 | ✅ 対策済み | 60日停止対策（keepalive）＋cron-job.orgが外部起動 |
| GitHubトークン | ✅ 無期限 | `focuslap-cron`（No expiration・Actions Read and write）。cron-job.orgのヘッダーとVercelの `GH_DISPATCH_TOKEN` の2か所で使用 |

### 壊れうる3パターン

1. **無料サービスの規約変更** — Vercel / Firebase / cron-job.org が将来プラン内容を変える可能性はゼロではない（起きても移行可能）
2. **GitHubトークンの削除** — トークンを消すと通知だけ止まる（アプリ本体は無事）。再発行したら**cron-job.orgのヘッダー**と**Vercelの `GH_DISPATCH_TOKEN`**（更新後に再デプロイ）の両方を更新する
3. **cron-job.orgの連続失敗による自動停止** — 停止時はメール通知が来る設定済み。cron-job.orgにログインして再有効化すればよい

---

## バックアップしておくべきもの

PCの買い替え・故障に備えて、メモアプリ等に控えておく：

- `.env.local` の中身（Firebase設定 6行＋`VITE_VAPID_PUBLIC_KEY`）
- VAPID秘密鍵（GitHub Secrets の `VAPID_PRIVATE_KEY` に入れたもの）
- Firebaseサービスアカウントの JSON（GitHub Secrets の `FIREBASE_SERVICE_ACCOUNT`）
- GitHubトークン `github_pat_...`（cron-job.org のヘッダーと Vercel の `GH_DISPATCH_TOKEN` に入れたもの）

### 使っているアカウント

| アカウント | 使う場所 |
|---|---|
| Googleアカウント | Firebase / Google Cloud Console |
| GitHubアカウント | コード管理・Actions・Secrets |
| Vercelアカウント | アプリ公開・環境変数（Firebase設定・VAPID公開鍵・`GH_DISPATCH_TOKEN`） |
| cron-job.orgアカウント | 通知タイマー |

---

## トラブルシューティング

### 通知が来ない
1. [GitHubのActions](https://github.com/wataken2004/focuslap/actions) を開き、`push-notify` の実行が**5分おき・緑✅**か確認
   - ログ末尾の `users with push: N (devices: N)` で、通知の宛先が登録されている端末数がわかる
   - 実行が無い → cron-job.org にログインしてジョブが有効か・HISTORYが緑か確認
   - 赤✗ → ログを開いてエラーを確認（Secretsの期限切れ等）
2. スマホ側：⚙️設定 → 📲プッシュ通知が「✓ 有効」か確認（iPhoneはホーム画面に追加したアプリからのみ有効化できる）
3. iPhoneのマナーモード中は音は鳴らない（表示とバイブのみ）
4. 集中終了の通知はほぼぴったり（数十秒以内）。開始時刻・期限リマインドは最大5〜8分遅れる仕様（5分間隔のチェックのため）
5. 集中終了だけ来ない → Actionsに `timer-push` の実行があるか確認。無ければVercelの環境変数 `GH_DISPATCH_TOKEN` を確認

### アプリが真っ白・エラーになる
- Vercelの Deployments で最新デプロイが緑か確認 → 赤なら直前の変更が原因。チャットで「デプロイが失敗してる」と伝えれば調査・修正できる

### ログインできない
- Firebase Console → Authentication → ログイン方法 で Google と メール/パスワード が「有効」か確認

### データが消えた・同期されない
- 同じアカウントでログインしているか確認（ゲストモードはブラウザ内のみ保存で同期されない）
- Firestoreのデータは `users/{uid}/data/main` に入っている。Firebase Consoleから直接確認できる

---

## 日常の開発フロー

```powershell
cd C:\Users\watak\Downloads\focuslap
git pull          # 編集前に最新を取得
# Claude Code に「〇〇して」と依頼（修正〜push まで自動）
```

手動でpushする場合：
```powershell
git add .
git commit -m "変更内容"
git push          # → Vercelが自動デプロイ
```
