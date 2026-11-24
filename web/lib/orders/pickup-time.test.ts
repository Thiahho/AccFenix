import { describe, expect, it } from "vitest";
import { isPastPickupTime, isPickupTime, pickupSlot, pickupTimeIn } from "@/lib/orders/pickup-time";

// 15:02 in Moreno (UTC-3).
const now = new Date("2026-11-24T18:02:00Z");

describe("pickup time", () => {
  it("accepts only a 24-hour time", () => {
    expect(isPickupTime("18:30")).toBe(true);
    expect(isPickupTime("24:00")).toBe(false);
    expect(isPickupTime("Hoy de 16 a 18 h")).toBe(false);
  });

  it("compares against the shop's clock", () => {
    expect(isPastPickupTime("15:01", now)).toBe(true);
    expect(isPastPickupTime("15:02", now)).toBe(false);
    expect(isPastPickupTime("18:00", now)).toBe(false);
  });

  it("rounds a quick choice up to five minutes", () => {
    expect(pickupTimeIn(30, now)).toBe("15:35");
    expect(pickupTimeIn(60, now)).toBe("16:05");
  });

  it("offers no quick choice that falls on the next day", () => {
    expect(pickupTimeIn(60, new Date("2026-11-25T02:30:00Z"))).toBeNull();
  });

  it("writes the time the way the shop reads it", () => {
    expect(pickupSlot(" 18:30 ")).toBe("Hoy 18:30 h");
  });
});
