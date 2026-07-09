"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name, phone: values.phone },
      },
    });
    if (error) {
      setLoading(false);
      // Don't reveal whether an email is already registered (account
      // enumeration). Show a neutral message and point them to sign in.
      const alreadyRegistered =
        error.status === 422 ||
        /already registered|already exists|user already/i.test(error.message);
      toast.error(
        alreadyRegistered
          ? "We couldn't create your account. If you already have one, please sign in."
          : error.message
      );
      return;
    }

    // Supabase returns a fake user with no identities when the email is
    // already registered (email-confirmation obfuscation). Treat this the
    // same neutral way instead of proceeding.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setLoading(false);
      toast.error(
        "We couldn't create your account. If you already have one, please sign in."
      );
      return;
    }

    // Email confirmation is disabled — sign the user in immediately if a
    // session wasn't already returned, then go straight to the dashboard.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (signInError) {
        setLoading(false);
        toast.error(signInError.message);
        return;
      }
    }

    toast.success("Welcome! Your account is ready.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-white">
        Create account
      </h1>
      <p className="mb-6 text-sm text-white/60">
        Register to top up your wallet and book courts.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          placeholder="Juan Dela Cruz"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <Input
          label="Mobile number"
          placeholder="09XX XXX XXXX"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />
        <Button type="submit" variant="gold" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-secondary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
