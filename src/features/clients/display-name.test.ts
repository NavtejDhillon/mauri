import { describe, expect, it } from "vitest";
import { displayName } from "./display-name";

describe("displayName", () => {
  it("uses first name and surname when there is no preferred name", () => {
    expect(displayName({ first_name: "Aroha", last_name: "Smith", preferred_name: null })).toBe("Aroha Smith");
  });

  it("leads with the preferred name and keeps the first name in brackets", () => {
    expect(displayName({ first_name: "Aroha", last_name: "Smith", preferred_name: "Ro" })).toBe("Ro (Aroha) Smith");
  });

  it("does not repeat a preferred name that is the first name", () => {
    expect(displayName({ first_name: "Aroha", last_name: "Smith", preferred_name: "Aroha" })).toBe("Aroha Smith");
    expect(displayName({ first_name: "Aroha", last_name: "Smith", preferred_name: "aroha" })).toBe("Aroha Smith");
  });

  it("ignores a blank preferred name and stray spaces", () => {
    expect(displayName({ first_name: "Aroha", last_name: "Smith", preferred_name: "  " })).toBe("Aroha Smith");
    expect(displayName({ first_name: " Aroha ", last_name: " Smith ", preferred_name: " Ro " })).toBe("Ro (Aroha) Smith");
  });

  it("keeps macrons as written", () => {
    expect(displayName({ first_name: "Mere", last_name: "Tūhoe", preferred_name: "Mā" })).toBe("Mā (Mere) Tūhoe");
  });
});
