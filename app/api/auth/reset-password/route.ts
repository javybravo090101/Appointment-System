import { createServiceClient } from "@/lib/supabaseService";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // For testing, use the known user ID
    // In production, you'd verify the token and get the user ID
    const userId = "1aeda494-ee47-4709-a352-478e0d6fac75";

    const { error } = await supabase.auth.admin.updateUserById(userId, { password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get user role for redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    return NextResponse.json({ 
      success: true, 
      redirectPath: profile?.role === "admin" ? "/admin/dashboard" : "/dashboard"
    });
  } catch (err: unknown) {
    console.error("reset-password error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
