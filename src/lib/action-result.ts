// What a form's server action returns to useActionState: null before the first submission
// (actions that succeed usually redirect), or a message to show. `field` names the input the
// message is about, if any. `values` carries the submitted non-secret values back, because
// React resets a form after every submission and the form shows them again as defaults.
// Passwords and codes are never put in `values`.
export type ActionResult = { error: string; field?: string; values?: Record<string, string> } | null;
