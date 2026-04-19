"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
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

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone, role: "client" },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Redirecting...");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50/60 to-white px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-muted p-2 sm:p-4">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-2">
            <PawPrint className="h-8 w-8 text-pawgreen" />
            <span className="text-2xl font-bold">PawCare</span>
          </Link>
          <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-base">Join PawCare to manage your pet&apos;s health</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
              <Input 
                id="full_name" 
                name="full_name" 
                placeholder="John Doe" 
                required 
                className="h-12 text-base px-4"
              />
            </div>
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
            <div className="space-y-2.5">
              <Label htmlFor="phone" className="text-sm font-medium">Phone (optional)</Label>
              <Input 
                id="phone" 
                name="phone" 
                type="tel" 
                placeholder="+63 900 000 0000" 
                className="h-12 text-base px-4"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
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
              className="w-full h-12 text-base font-semibold bg-pawgreen hover:bg-pawgreen-dark text-white mt-4"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Create Account
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-medium text-pawgreen hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
