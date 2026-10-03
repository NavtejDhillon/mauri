import { MfaChallengeForm } from "@/features/auth/mfa-challenge-form";

export default function MfaPage() {
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-sage-900">Second step</h1>
          <p className="text-sm text-warm-400 mt-1">Enter the code from your authenticator app</p>
        </div>
        <MfaChallengeForm />
      </div>
    </div>
  );
}
