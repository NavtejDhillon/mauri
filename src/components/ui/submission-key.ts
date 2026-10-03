const keys = new WeakMap<object, number>();
let last = 0;

// A React key that changes with every result a form action returns. React resets a form after
// each submission, so uncontrolled inputs fall back to their defaultValue; keying the fields
// with this remounts them, so the defaults taken from the latest result (the values she
// submitted) apply. Each result is a new object, so the same object always gets the same key.
export function submissionKey(state: object | null): number {
  if (!state) return 0;
  let key = keys.get(state);
  if (key === undefined) {
    key = ++last;
    keys.set(state, key);
  }
  return key;
}
