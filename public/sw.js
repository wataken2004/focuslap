const CACHE = "focuslap-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// プッシュ通知の受信（アプリが閉じていても動く）
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let data = {};
    try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data?.text() }; }
    // 重要：iPhoneでは push を受けたら必ず通知を表示しなければならない。
    // 表示しない（サイレント）pushが数回続くと、iOSが購読を取り消して以後一切届かなくなる。
    // スリープ中もiOSは「アプリが表示中」と報告することがあるため、アプリを開いていても常に表示する。
    const tag = "focuslap-" + Date.now();
    await self.registration.showNotification(data.title || "FocusLap", {
      body: data.body || "",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag,
      silent: false,              // 端末の通知音を鳴らす
      vibrate: [150, 80, 150],    // Androidはバイブも
    });
  })());
});

// 通知タップでアプリを開く
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) { if ("focus" in c) return c.focus(); }
    return clients.openWindow("./");
  })());
});
