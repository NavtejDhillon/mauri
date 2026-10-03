import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";
import { FormMessage } from "@/components/ui/form-message";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sage-600 rounded-[14px] mb-4">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-sage-900">Mauri</h1>
          <p className="text-sm text-warm-400 mt-1">Maternity practice management</p>
        </div>
        {invite === "invalid" && (
          <div className="mb-4">
            <FormMessage error="That invitation link is not valid or has expired. Ask for a new one." />
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
