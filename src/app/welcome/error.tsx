"use client";

import { SignInStepError } from "@/features/auth/sign-in-step-error";

// Inside the welcome layout, which already centres the page and offers sign-out.
export default function WelcomeError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SignInStepError {...props} />;
}
