import { describe, expect, it } from "vitest";
import { checkNhi } from "./nhi";

describe("checkNhi", () => {
  it("accepts old-format test NHIs from Health NZ's validation routine and published examples", () => {
    // ZZZ0016 and ZZZ0024 are the worked examples in the NHI Validation Routine (April 2023).
    // ZKP3424 and ZWX5200 are test NHIs in the NHI FHIR implementation guide's compliance
    // testing page; ZWX5200 is a check of 10 written as 0.
    for (const nhi of ["ZZZ0016", "ZZZ0024", "ZKP3424", "ZWX5200", "ZAC5361", "ZAA0105", "JBX3656", "ABC1235"]) {
      expect(checkNhi(nhi), nhi).toBe("valid");
    }
  });

  it("refuses an old-format NHI whose check digit is wrong", () => {
    for (const nhi of ["ZZZ0017", "ZZZ0061", "ABC1234", "ZKP3425"]) {
      expect(checkNhi(nhi), nhi).toBe("check");
    }
  });

  it("refuses an old-format NHI whose remainder is 0, as no check digit can complete it", () => {
    // The routine's own example: no digit can be added to ZZZ004 to make a valid NHI.
    for (let d = 0; d <= 9; d++) expect(checkNhi(`ZZZ004${d}`)).toBe("check");
  });

  it("accepts new-format test NHIs from Health NZ", () => {
    // ZZZ00AC and ZVU27KE: the routine's worked examples. ZXE24NV to ZVE74QH: the compliance
    // testing page. ZAP28LA to ZYZ89XY: the Mod23 UAT test records, where ZYZ89XY has a
    // remainder of 0 and so the check letter Y. ZBN77VL: a commonly cited valid example.
    const valid = ["ZZZ00AC", "ZVU27KE", "ZXE24NV", "ZUA48EH", "ZUT01RG", "ZNK28DJ", "ZTL39SK", "ZWB84LW", "ZQF54PV", "ZAK21MS", "ZYC49PX", "ZDP92ZR", "ZVE74QH", "ZAP28LA", "ZBD33XL", "ZGA02YJ", "ZMZ61ZB", "ZYZ89XY", "ZBN77VL"];
    for (const nhi of valid) expect(checkNhi(nhi), nhi).toBe("valid");
  });

  it("refuses a new-format NHI whose check letter is wrong", () => {
    for (const nhi of ["ZZZ00AA", "ZVU27KF", "ZXE24NW", "ZYZ89XX"]) {
      expect(checkNhi(nhi), nhi).toBe("check");
    }
  });

  it("uses modulus 23, not the earlier modulus 24 draft", () => {
    // Under modulus 24 the check letter for ZZZ00A would be X.
    expect(checkNhi("ZZZ00AX")).toBe("check");
  });

  it("refuses anything that is not seven characters in one of the two shapes", () => {
    for (const nhi of ["", "ZZZ001", "ZZZ00166", "ZZ00166", "1ZZ0016", "ZZZ0A16", "ZZZ00A1", "ZZZ001A"]) {
      expect(checkNhi(nhi), nhi).toBe("shape");
    }
  });

  it("refuses the letters I and O anywhere", () => {
    for (const nhi of ["IOI1234", "ZZI0016", "ZZZ00OC", "ZZZ00AI"]) {
      expect(checkNhi(nhi), nhi).toBe("shape");
    }
  });

  it("ignores case and spaces", () => {
    expect(checkNhi(" zzz 0016 ")).toBe("valid");
    expect(checkNhi("zvu27ke")).toBe("valid");
  });
});
