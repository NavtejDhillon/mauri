import { SignOutLink } from "@/features/auth/sign-out-link";

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {children}
        <SignOutLink />
      </div>
    </div>
  );
}
