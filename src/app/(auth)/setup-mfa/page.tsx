"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SetupMFAPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function enroll() {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Mauri Authenticator",
      });

      if (error) {
        setError(error.message);
        setEnrolling(false);
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setEnrolling(false);
    }

    enroll();
  }, [supabase.auth.mfa]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setError(null);

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: verifyCode,
    });

    if (verify.error) {
      setError(verify.error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sage-600 rounded-[14px] mb-4">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-sage-900">Set up MFA</h1>
          <p className="text-sm text-warm-400 mt-1">Scan this QR code with your authenticator app</p>
        </div>

        <div className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
          {enrolling && (
            <div className="text-center text-sm text-warm-400">Setting up authenticator...</div>
          )}

          {qrCode && (
            <div className="flex flex-col items-center space-y-3">
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
              {secret && (
                <div className="text-center">
                  <p className="text-xs text-warm-400 uppercase tracking-[0.05em] mb-1">Manual entry code</p>
                  <code className="text-xs font-mono text-warm-600 bg-warm-50 px-2 py-1 rounded-[10px] select-all">
                    {secret}
                  </code>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full px-3 py-2 text-sm text-center font-mono border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 tracking-[0.2em] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="text-sm text-coral-600 bg-coral-50 border border-coral-100 rounded-[10px] px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || verifyCode.length !== 6}
              className="w-full py-2.5 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {loading ? "Verifying..." : "Verify and enable"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
