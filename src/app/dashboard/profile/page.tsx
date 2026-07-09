import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
        <p className="text-white/60">Manage your account details.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-secondary-dark text-2xl font-bold text-black">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            <h3 className="mt-3 font-display font-semibold text-white">
              {user.full_name || "Player"}
            </h3>
            <p className="text-sm text-white/60">{user.email}</p>
            <div className="mt-4 w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Wallet</span>
                <span className="font-semibold gold-text">
                  {formatCurrency(user.wallet_balance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Member since</span>
                <span className="text-white">{formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Edit profile" />
            <ProfileForm
              defaultValues={{
                full_name: user.full_name ?? "",
                phone: user.phone ?? "",
              }}
              email={user.email}
            />
          </Card>

          <Card>
            <CardHeader title="Change password" />
            <ChangePasswordForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
