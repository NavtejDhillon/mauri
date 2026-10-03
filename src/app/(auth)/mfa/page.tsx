import type { Metadata } from "next";
import { requireStep } from "@/features/auth/require-step";
import { SignOutLink } from "@/features/auth/sign-out-link";
import { MfaChallengeForm } from "@/features/auth/mfa-challenge-form";

export const metadata: Metadata = { title: "Enter your code" };

export default async function MfaPage() {
  await requireStep("/mfa");
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-sage-900">Second step</h1>
          <p className="text-sm text-warm-400 mt-1">Enter the code from your authenticator app</p>
        </div>
        <MfaChallengeForm />
        <SignOutLink />
      </div>
    </div>
  );
}
