# FocusLap 運用ガイド

アプリを支えているサービスの全体像と、「永久に動かし続ける」ための知識をまとめたガイド。

---

## 使っているサービス一覧

### アプリ本体を支える4つ（メイン）

| ツール | 例えると | やっていること |
|---|---|---|
| **GitHub** | レシピ帳の保管庫 | アプリのコード（設計図）を保存する場所。修正はここにpushされる |
| **Vercel** | お店の店舗 | GitHubのコードをWebサイトとして公開。`https://focuslap-iggi.vercel.app` を配信 |
| **Firebase** | 顧客名簿と金庫 | ログイン管理（Google / メール+パスワード）と、ユーザーごとのデータ保存（タスク・魚・メモ・アーカイブ） |
| **cron-job.org** | 目覚まし時計 | 5分ごとに「通知チェックして！」とGitHubを起こす係 |

### 裏方の2つ

| ツール | 例えると | やっていること |
|---|---|---|
| **GitHub Actions** | 配達員 | 起こされたらFirebaseを確認し、該当者のスマホへプッシュ通知を発送 |
| **Google Cloud Console** | 役所の窓口 | 「Googleでログイン」の許可証（OAuth）を発行している所 |

### 全体の流れ

```
開発：
  「直して」と依頼 → コード修正 → GitHubに保存
  → Vercelが自動で公開（1〜2分） → スマホで使える

通知：
  cron-job.org（5分ごと）
  → GitHub Actions（送信ジョブ起動）
  → Firestoreを確認（終了したタイマー / 開始時刻 / リマインド）
  → Web Pushでスマホへ（アプリを閉じていてもロック画面に表示）
```

---

## 永久保存の状態

| もの | 状態 | 条件・注意 |
|---|---|---|
| コード（GitHub） | ✅ 永久 | 削除しない限り消えない |
| アプリ公開（Vercel） | ✅ 永久 | 無料Hobbyプランのまま動き続ける |
| ユーザーデータ（Firestore） | ✅ 永久 | セキュリティルール本番設定済み（期限なし） |
| ログイン機能 | ✅ 永久 | OAuth同意画面は本番公開済み |
| 通知の定期実行 | ✅ 対策済み | 60日停止対策（keepalive）＋cron-job.orgが外部起動 |
| GitHubトークン | ✅ 無期限 | `focuslap-cron`（No expiration・Actions Read and write） |

### 壊れうる3パターン

1. **無料サービスの規約変更** — Vercel / Firebase / cron-job.org が将来プラン内容を変える可能性はゼロではない（起きても移行可能）
2. **GitHubトークンの削除** — トークンを消すと通知だけ止まる（アプリ本体は無事）。再発行したらcron-job.orgのヘッダーも更新する
3. **cron-job.orgの連続失敗による自動停止** — 停止時はメール通知が来る設定済み。cron-job.orgにログインして再有効化すればよい

---

## バックアップしておくべきもの

PCの買い替え・故障に備えて、メモアプリ等に控えておく：

- `.env.local` の中身（Firebase設定 6行＋`VITE_VAPID_PUBLIC_KEY`）
- VAPID秘密鍵（GitHub Secrets の `VAPID_PRIVATE_KEY` に入れたもの）
- Firebaseサービスアカウントの JSON（GitHub Secrets の `FIREBASE_SERVICE_ACCOUNT`）
- GitHubトークン `github_pat_...`（cron-job.org のヘッダーに入れたもの）

### 使っているアカウント

| アカウント | 使う場所 |
|---|---|
| Googleアカウント | Firebase / Google Cloud Console |
| GitHubアカウント | コード管理・Actions・Secrets |
| Vercelアカウント | アプリ公開・環境変数 |
| cron-job.orgアカウント | 通知タイマー |

---

## トラブルシューティング

### 通知が来ない
1. [GitHubのActions](https://github.com/wataken2004/focuslap/actions) を開き、最近の実行が**5分おき・緑✅**か確認
   - 実行が無い → cron-job.org にログインしてジョブが有効か・HISTORYが緑か確認
   - 赤✗ → ログを開いてエラーを確認（Secretsの期限切れ等）
2. スマホ側：⚙️設定 → 📲プッシュ通知が「✓ 有効」か確認（iPhoneはホーム画面に追加したアプリからのみ有効化できる）
3. iPhoneのマナーモード中は音は鳴らない（表示とバイブのみ）
4. 通知は最大5〜8分遅れる仕様（5分間隔のチェックのため）

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
