import { describe, expect, it } from "vitest";
import { otpauthUri } from "./otpauth-uri";

describe("otpauthUri", () => {
  it("builds the key URI authenticator apps open, with Mauri as the issuer", () => {
    expect(otpauthUri("JBSWY3DPEHPK3PXP", "aroha@example.nz")).toBe("otpauth://totp/Mauri:aroha%40example.nz?secret=JBSWY3DPEHPK3PXP&issuer=Mauri");
  });

  it("encodes characters that would break the URI", () => {
    expect(otpauthUri("ABC", "a+b c@example.nz")).toBe("otpauth://totp/Mauri:a%2Bb%20c%40example.nz?secret=ABC&issuer=Mauri");
  });
});
