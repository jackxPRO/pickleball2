"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Block disabled customer accounts — sign them back out immediately.
    const { data: profile } = await supabase
      .from("users")
      .select("is_disabled")
      .eq("auth_id", data.user.id)
      .maybeSingle();
    if (profile?.is_disabled) {
      await supabase.auth.signOut();
      toast.error("Your account has been disabled. Please contact support.");
      setLoading(false);
      return;
    }

    // Route admins to the admin panel automatically.
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_id", data.user.id)
      .maybeSingle();
    toast.success("Welcome back!");
    const redirect = params.get("redirect");
    router.push(admin ? "/admin" : redirect ?? "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-white">
        Sign in
      </h1>
      <p className="mb-6 text-sm text-white/60">
        Access your wallet and book a court.
      </p>

      {params.get("error") === "admin_required" && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Please sign in with an administrator account.
        </p>
      )}

      {params.get("error") === "disabled" && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Your account has been disabled. Please contact support.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" variant="gold" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        No account?{" "}
        <Link href="/register" className="font-semibold text-secondary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
