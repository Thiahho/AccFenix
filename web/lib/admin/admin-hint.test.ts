import { describe, expect, it } from "vitest";
import { hasAdminHint } from "./admin-hint";

describe("hasAdminHint", () => {
  it("detects the hint among other cookies", () => {
    expect(hasAdminHint("theme=dark; accfenix_admin_hint=1; cart=abc")).toBe(true);
  });

  it("is false without the hint", () => {
    expect(hasAdminHint("")).toBe(false);
    expect(hasAdminHint("theme=dark; x_accfenix_admin_hint=1")).toBe(false);
  });
});
