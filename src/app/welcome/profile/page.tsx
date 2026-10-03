import type { Metadata } from "next";
import { requireStep } from "@/features/auth/require-step";
import { ProfileForm } from "@/features/onboarding/profile-form";

export const metadata: Metadata = { title: "About you" };

export default async function WelcomeProfilePage() {
  await requireStep("/welcome/profile");
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
