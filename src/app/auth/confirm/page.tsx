import Link from "next/link";
import { FormMessage } from "@/components/ui/form-message";
import { ConfirmInviteForm } from "@/features/onboarding/confirm-invite-form";

type Params = { token_hash?: string | string[]; type?: string | string[] };

// The page an invite link opens. Showing it uses nothing up; the token is only exchanged when
// she presses Continue. The link format is the one the invite script prints:
// /auth/confirm?token_hash=...&type=invite
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { token_hash: tokenHash, type } = await searchParams;
  const valid = typeof tokenHash === "string" && tokenHash.length > 0 && type === "invite";
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-sage-900">Welcome to Mauri</h1>
          <p className="text-sm text-warm-400 mt-1">Maternity practice management</p>
        </div>
        {valid ? (
          <ConfirmInviteForm tokenHash={tokenHash} />
        ) : (
          <div className="space-y-4 text-center">
            <FormMessage error="That invitation link is not valid or has expired. Ask for a new one." />
            <Link href="/login" className="inline-block text-sm text-warm-600 underline underline-offset-2 py-2">Go to sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
