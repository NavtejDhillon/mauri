import type { Metadata } from "next";
import { requireStep } from "@/features/auth/require-step";
import { PasswordForm } from "@/features/onboarding/password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default async function WelcomePasswordPage() {
  await requireStep("/welcome/password");
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-sage-900">Welcome to Mauri</h1>
        <p className="text-sm text-warm-400 mt-1">Step 1 of 3: choose a password</p>
      </div>
      <PasswordForm />
    </>
  );
}
