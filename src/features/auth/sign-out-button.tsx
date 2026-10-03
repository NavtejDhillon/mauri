import { signOut } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium rounded-[10px] text-coral-600 bg-coral-50 border border-coral-100 active:bg-coral-100">
        Sign out everywhere
      </button>
    </form>
  );
}
