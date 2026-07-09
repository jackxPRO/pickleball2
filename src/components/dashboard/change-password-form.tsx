"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation";
import { getErrorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordInput) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      toast.success("Password changed");
      reset();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="New password"
        type="password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label="Confirm password"
        type="password"
        error={errors.confirm_password?.message}
        {...register("confirm_password")}
      />
      <Button type="submit" variant="outline" loading={loading}>
        Update password
      </Button>
    </form>
  );
}
