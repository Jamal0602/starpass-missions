export type Schedule = {
  mission_day: number;
  title: string;
  theme: string;
  active_date: string;
  start_time: string;
  end_time: string;
  is_force_open: boolean;
  is_force_closed: boolean;
};

export type StampState = "stamped" | "active" | "upcoming" | "locked" | "missed";

const IST_OFFSET = 5.5 * 3600 * 1000;

/** Convert an IST date (YYYY-MM-DD) + time (HH:MM[:SS]) into a UTC epoch ms. */
export function istToEpoch(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi, s = 0] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, mi, s) - IST_OFFSET;
}

export function istNowParts(now = Date.now()) {
  const t = new Date(now + IST_OFFSET);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    clock: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`,
  };
}

export function stampState(s: Schedule, stamped: boolean, now = Date.now()): StampState {
  if (stamped) return "stamped";
  if (s.is_force_closed) {
    return now > istToEpoch(s.active_date, s.end_time) ? "missed" : "locked";
  }
  const start = istToEpoch(s.active_date, s.start_time);
  const end = istToEpoch(s.active_date, s.end_time);
  if (s.is_force_open || (now >= start && now <= end)) return "active";
  if (now > end) return "missed";
  if (istNowParts(now).date === s.active_date) return "upcoming";
  return "locked";
}

export function formatCountdown(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

export const hhmm = (t: string) => t.slice(0, 5);
