// National Health Index (NHI) number validation, following the Health New Zealand "NHI
// Validation Routine" (nhi_validation_routine_Apr_2023v6.doc, linked from Health NZ's
// "Upcoming changes to the NHI" page) and HISO 10046 Consumer Health Identity Standard.
//
// Two formats, seven characters, letters never I or O:
// - old AAANNNC: three letters, three digits, a check digit
// - new AAANNAX: three letters, two digits, a letter, a check letter
// Letters count A=1 to Z=24 skipping I and O; digits count at face value. The first six
// characters are weighted 7, 6, 5, 4, 3, 2 and summed.
// - Old format: check = 11 - (sum mod 11). A remainder of 0 (check 11) is invalid; a check of
//   10 becomes 0.
// - New format: check = 23 - (sum mod 23), read back as a letter from the same table. A
//   remainder of 0 gives 23, the letter Y, which is valid: Health NZ's Mod23 test data
//   (UAT-NHI-Records-Mod23-v2.xlsx) includes ZYZ89XY.
// NHIs starting with Z are reserved for testing; they pass here so test records can be used.

const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const shape = /^[A-HJ-NP-Z]{3}(?:\d{4}|\d{2}[A-HJ-NP-Z]{2})$/;

function value(char: string): number {
  return /\d/.test(char) ? Number(char) : letters.indexOf(char) + 1;
}

export type NhiCheck = "valid" | "shape" | "check";

// Upper-cases and drops spaces, then reports "valid", "shape" (not seven characters in either
// format, or uses I or O) or "check" (the right shape, but the check character is wrong).
export function checkNhi(input: string): NhiCheck {
  const nhi = input.replace(/\s+/g, "").toUpperCase();
  if (!shape.test(nhi)) return "shape";
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += value(nhi[i]) * (7 - i);
  if (/\d/.test(nhi[6])) {
    const remainder = sum % 11;
    if (remainder === 0) return "check";
    return (11 - remainder) % 10 === Number(nhi[6]) ? "valid" : "check";
  }
  return letters[23 - (sum % 23) - 1] === nhi[6] ? "valid" : "check";
}
