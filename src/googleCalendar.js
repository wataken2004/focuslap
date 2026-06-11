const BASE = "https://www.googleapis.com/calendar/v3";

export async function listCalendarEvents(accessToken, dateFrom, dateTo) {
  const params = new URLSearchParams({
    timeMin: new Date(dateFrom + "T00:00:00").toISOString(),
    timeMax: new Date(dateTo + "T23:59:59").toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await fetch(`${BASE}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((ev) => ({
    id: ev.id,
    title: ev.summary || "(無題)",
    date: (ev.start?.date || ev.start?.dateTime || "").slice(0, 10),
    source: "gcal",
  }));
}

export async function createCalendarEvent(accessToken, { title, date }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: title,
    start: { date },
    end: { date },
  };
  const res = await fetch(`${BASE}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  return res.json();
}
