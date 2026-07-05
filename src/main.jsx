import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SharedCalendarPage, GroupCalendarPage } from "./SharedCalendar.jsx";

// ?share=ID → 個人カレンダーの閲覧ページ / ?group=ID → グループカレンダー
const params = new URLSearchParams(window.location.search);
const shareId = params.get("share");
const groupId = params.get("group");

createRoot(document.getElementById("root")).render(
  shareId ? <SharedCalendarPage shareId={shareId} />
  : groupId ? <GroupCalendarPage groupId={groupId} />
  : <App />
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
