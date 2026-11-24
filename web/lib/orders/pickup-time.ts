// Pickup is for the same day, at a time of the shop's clock (Moreno), whatever the visitor's or the server's time zone.

const shopClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

const MINUTES_IN_DAY = 24 * 60;
const ROUND_TO_MINUTES = 5;

export const PICKUP_PAST_MESSAGE = "Elegí una hora que todavía no haya pasado";

/** "18:30", the value of a native time input. */
export function isPickupTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
};

function shopMinutes(now: Date) {
  const parts = shopClock.formatToParts(now);
  const part = (type: "hour" | "minute") => Number(parts.find((p) => p.type === type)?.value);
  return part("hour") * 60 + part("minute");
}

export function isPastPickupTime(value: string, now: Date) {
  return isPickupTime(value) && toMinutes(value) < shopMinutes(now);
}

/** The time `minutes` from now, rounded up to 5 minutes. Null when it falls on the next day. */
export function pickupTimeIn(minutes: number, now: Date): string | null {
  const total = Math.ceil((shopMinutes(now) + minutes) / ROUND_TO_MINUTES) * ROUND_TO_MINUTES;
  if (total >= MINUTES_IN_DAY) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** What the shop reads on the order: "Hoy 18:30 h". */
export function pickupSlot(value: string) {
  const time = value.trim();
  return isPickupTime(time) ? `Hoy ${time} h` : time;
}
