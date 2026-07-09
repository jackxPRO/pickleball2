"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { userRepository } from "@/lib/repositories/user.repository";
import { profileSchema, type ProfileInput } from "@/lib/validation";
import { getErrorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: ProfileInput;
  email: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  async function onSubmit(values: ProfileInput) {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await userRepository.updateProfile(supabase, user.id, values);
      toast.success("Profile updated");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full name"
        error={errors.full_name?.message}
        {...register("full_name")}
      />
      <Input
        label="Mobile number"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Input label="Email" value={email} disabled readOnly />
      <Button type="submit" variant="gold" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}
