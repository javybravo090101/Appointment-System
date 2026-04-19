import { createServiceClient } from "@/lib/supabaseService";
import { sendEmail } from "@/lib/brevoMailer";
import { NextResponse } from "next/server";

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const key = email.toLowerCase().trim();
    const now = Date.now();
    const entry = attempts.get(key);

    if (entry) {
      if (now < entry.resetAt) {
        if (entry.count >= RATE_LIMIT_MAX) {
          const waitMin = Math.ceil((entry.resetAt - now) / 60000);
          return NextResponse.json(
            { error: `Too many requests. Please wait ${waitMin} minute(s) before trying again.` },
            { status: 429 }
          );
        }
        entry.count++;
      } else {
        attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    // Use admin API to generate recovery link manually
    const supabase = createServiceClient();
    
    // First get the user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === key);
    
    if (!user || userError) {
      console.log("User not found, returning silent success");
      return NextResponse.json({ success: true });
    }
    
    // Generate a direct reset link with tokens
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: key,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
      },
    });
    
    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ success: true });
    }
    
    // Extract the token from the Supabase link and create a direct link
    const supabaseLink = data.properties.action_link;
    const tokenMatch = supabaseLink.match(/token=([^&]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (!token) {
      return NextResponse.json({ success: true });
    }
    
    // Create direct reset link with token
    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password?token=${token}&type=recovery`;
    
    // Send via Brevo
    await sendEmail({
      to: { email: key, name: key },
      subject: "Reset Your PawCare Password",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4f9d69; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🐾 PawCare Clinic</h1>
          </div>
          <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #374151; line-height: 1.6;">
              We received a request to reset the password for your PawCare account associated with this email address.
              Click the button below to reset it.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}"
                style="background-color: #4f9d69; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              PawCare Clinic — Caring for your pets, one paw at a time
            </p>
          </div>
        </div>
      `,
    });
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
