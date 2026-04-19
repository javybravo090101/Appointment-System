"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Simple check: if we have a token parameter, show the reset form
    // The actual verification will happen when they try to update the password
    const token = searchParams.get("token");
    const type = searchParams.get("type");

    if (!token || type !== "recovery") {
      toast.error("Invalid or expired reset link");
      router.push("/login");
      return;
    }

    setTokenValid(true);
    setChecking(false);
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const token = searchParams.get("token");
    
    if (!token) {
      toast.error("Invalid reset link");
      setLoading(false);
      return;
    }
    
    // Call API to update password
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Failed to reset password");
      setLoading(false);
      return;
    }

    toast.success("Password updated successfully!");
    
    // Redirect to the appropriate dashboard
    router.push(data.redirectPath);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50/60 to-white px-4">
        <Card className="w-full max-w-md shadow-lg border-muted p-8 text-center">
          <PawPrint className="h-12 w-12 text-pawgreen mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50/60 to-white px-4">
      <Card className="w-full max-w-md shadow-lg border-muted p-2 sm:p-4">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-2">
            <PawPrint className="h-8 w-8 text-pawgreen" />
            <span className="text-2xl font-bold">PawCare</span>
          </Link>
          <CardTitle className="text-3xl font-bold tracking-tight">Reset password</CardTitle>
          <CardDescription className="text-base">Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-12 text-base px-4"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="confirm_password" className="text-sm font-medium">Confirm Password</Label>
              <Input 
                id="confirm_password" 
                name="confirm_password" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-12 text-base px-4"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-pawgreen hover:bg-pawgreen-dark text-white mt-2"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
