const DATE_FORMAT = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/New_York",
});

export function formatMatchDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

const LOCK_OFFSET_MS = 10 * 60 * 1000;

export function isMatchLocked(matchDate: string): boolean {
  return Date.now() >= new Date(matchDate).getTime() - LOCK_OFFSET_MS;
}

export function minutesUntilLock(matchDate: string): number {
  const ms = new Date(matchDate).getTime() - LOCK_OFFSET_MS - Date.now();
  return Math.max(0, Math.floor(ms / 60_000));
}
