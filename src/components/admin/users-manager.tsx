"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Wallet, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { userRepository } from "@/lib/repositories/user.repository";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import type { AppUser } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { deleteUserAction } from "@/app/admin/users/actions";

export function UsersManager({
  users,
  currency,
  adminAuthIds = [],
  adminEmails = [],
}: {
  users: AppUser[];
  currency: string;
  adminAuthIds?: string[];
  adminEmails?: string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [search, setSearch] = useState("");
  const [adjust, setAdjust] = useState<AppUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AppUser | null>(null);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const adminAuthIdSet = useMemo(() => new Set(adminAuthIds), [adminAuthIds]);
  const adminEmailSet = useMemo(
    () => new Set(adminEmails.map((e) => e.toLowerCase())),
    [adminEmails]
  );
  const isAdmin = (u: AppUser) =>
    adminAuthIdSet.has(u.auth_id) ||
    (!!u.email && adminEmailSet.has(u.email.toLowerCase()));

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  async function toggleDisabled(u: AppUser) {
    if (isAdmin(u)) {
      toast.error("Admin accounts cannot be disabled.");
      return;
    }
    setBusy(u.id);
    try {
      await userRepository.setDisabled(supabase, u.id, !u.is_disabled);
      toast.success(u.is_disabled ? "User enabled" : "User disabled");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function doAdjust() {
    if (!adjust) return;    const amt = Number(amount);
    if (!amt || !desc) {
      toast.error("Enter an amount and description");
      return;
    }
    setBusy(adjust.id);
    try {
      await walletRepository.adjust(supabase, adjust.id, amt, desc);
      toast.success("Wallet adjusted");
      setAdjust(null);
      setAmount("");
      setDesc("");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    if (!removeTarget) return;
    setBusy(removeTarget.id);
    try {
      const res = await deleteUserAction(removeTarget.id);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to delete user");
        return;
      }
      toast.success("User account deleted");
      setRemoveTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="input pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 text-right font-medium">Wallet</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="p-4 font-medium text-white">
                    {u.full_name || "—"}
                  </td>
                  <td className="p-4 text-white/60">
                    {u.email}
                    <span className="block text-xs">{u.phone}</span>
                  </td>
                  <td className="p-4 text-right font-semibold gold-text">
                    {formatCurrency(u.wallet_balance, currency)}
                  </td>
                  <td className="p-4 text-white/60">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="p-4">
                    <Badge
                      className={
                        u.is_disabled
                          ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }
                    >
                      {u.is_disabled ? "Disabled" : "Active"}
                    </Badge>
                    {isAdmin(u) && (
                      <Badge className="ml-1 border-secondary/40 bg-secondary/10 text-secondary">
                        Admin
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Adjust wallet"
                        onClick={() => setAdjust(u)}
                        className="rounded-lg p-1.5 text-secondary hover:bg-secondary/10"
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                      <button
                        title={
                          isAdmin(u)
                            ? "Admin accounts cannot be disabled"
                            : u.is_disabled
                            ? "Enable"
                            : "Disable"
                        }
                        disabled={busy === u.id || isAdmin(u)}
                        onClick={() => toggleDisabled(u)}
                        className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {u.is_disabled ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        title="Delete account"
                        disabled={busy === u.id}
                        onClick={() => setRemoveTarget(u)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!adjust}
        onClose={() => setAdjust(null)}
        title="Adjust wallet"
      >
        {adjust && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              {adjust.full_name || adjust.email} — current balance{" "}
              <span className="font-semibold gold-text">
                {formatCurrency(adjust.wallet_balance, currency)}
              </span>
            </p>
            <Input
              type="number"
              label="Amount (use negative to deduct)"
              placeholder="e.g. 500 or -100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="Reason for adjustment"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAdjust(null)}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                loading={busy === adjust.id}
                onClick={doAdjust}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Delete user account?"
      >
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Permanently delete{" "}
              <span className="font-semibold text-white">
                {removeTarget.full_name || removeTarget.email}
              </span>
              ? This removes their login, wallet, and all bookings. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRemoveTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={busy === removeTarget.id}
                onClick={doDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
