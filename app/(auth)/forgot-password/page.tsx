"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Failed to send reset email");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50/60 to-white px-4">
      <Card className="w-full max-w-md shadow-lg border-muted p-2 sm:p-4">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-2">
            <PawPrint className="h-8 w-8 text-pawgreen" />
            <span className="text-2xl font-bold">PawCare</span>
          </Link>
          <CardTitle className="text-3xl font-bold tracking-tight">Forgot password?</CardTitle>
          <CardDescription className="text-base">
            {sent
              ? "Check your email for a reset link"
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com" 
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
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-5">
              <p className="text-base text-muted-foreground">
                If an account with that email exists, you&apos;ll receive a password reset email shortly.
              </p>
              <Button variant="outline" onClick={() => setSent(false)} className="w-full h-12 text-base font-semibold">
                Send again
              </Button>
            </div>
          )}
          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-pawgreen hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
