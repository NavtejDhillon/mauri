import type { ActionResult } from "@/lib/action-result";

// What saving her profile returns: null before the first submission, an error with the values
// she entered, or the values as saved.
export type SaveResult = ActionResult | { saved: true; values: Record<string, string> };
