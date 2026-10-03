import { requireReady } from "@/features/auth/require-ready";
import { getProfile } from "@/features/settings/queries";
import { ProfileForm } from "@/features/settings/profile-form";
import { SignOutButton } from "@/features/auth/sign-out-button";

export default async function SettingsPage() {
  await requireReady();
  const profile = await getProfile();
  return (
    <div className="md:max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">Settings</h1>
      <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h2 className="text-[15px] font-medium text-sage-900 mb-3">Your details</h2>
        <ProfileForm profile={profile} />
      </section>
      <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h2 className="text-[15px] font-medium text-sage-900 mb-3">Account</h2>
        <p className="text-sm text-warm-400 mb-3">Signing out ends your session on every device.</p>
        <SignOutButton />
      </section>
    </div>
  );
}
