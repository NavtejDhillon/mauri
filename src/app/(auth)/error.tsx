"use client";

import { SignInStepError } from "@/features/auth/sign-in-step-error";

// For the sign-in and code pages, which have no shared layout, so this centres itself.
export default function AuthError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <SignInStepError {...props} />
      </div>
    </div>
  );
}
