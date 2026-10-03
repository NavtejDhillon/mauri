import { PasswordForm } from "@/features/onboarding/password-form";

export default function WelcomePasswordPage() {
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
