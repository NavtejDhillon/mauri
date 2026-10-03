import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the token in an invite or recovery link for a session, then hands over to the welcome steps.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const failed = new URL("/login?invite=invalid", request.url);
  if (!tokenHash || !type) return NextResponse.redirect(failed);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(failed);
  return NextResponse.redirect(new URL("/", request.url));
}
