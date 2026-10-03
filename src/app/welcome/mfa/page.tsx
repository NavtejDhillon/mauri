import { MfaEnrol } from "@/features/onboarding/mfa-enrol";

export default function WelcomeMfaPage() {
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-sage-900">Protect your account</h1>
        <p className="text-sm text-warm-400 mt-1">Step 2 of 3: scan this code with an authenticator app such as Google Authenticator or Authy</p>
      </div>
      <MfaEnrol />
    </>
  );
}
