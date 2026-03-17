"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-[26px] font-semibold text-sage-900 mb-6">Settings</h1>
      <div className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
        <div>
          <h2 className="text-[15px] font-medium text-sage-900 mb-2">Account</h2>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-coral-600 bg-coral-50 border border-coral-100 rounded-[10px] hover:bg-coral-100 transition-colors duration-150"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
