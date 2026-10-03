import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("takes the first x-forwarded-for value", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("ignores x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("unknown");
  });
  it("reports unknown when x-forwarded-for is empty", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " ", "x-real-ip": "198.51.100.2" }))).toBe("unknown");
  });
  it("reports unknown when there is no x-forwarded-for", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
