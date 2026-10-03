import { ProfileForm } from "@/features/onboarding/profile-form";

export default function WelcomeProfilePage() {
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-sage-900">About you</h1>
        <p className="text-sm text-warm-400 mt-1">Step 3 of 3: your practitioner details</p>
      </div>
      <ProfileForm />
    </>
  );
}
