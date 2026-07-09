"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Admin, AdminRole } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createAdminAction, revokeAdminAction } from "@/app/admin/admins/actions";

const ROLE_STYLES: Record<AdminRole, string> = {
  SUPER_ADMIN: "border-secondary/40 bg-secondary/10 text-secondary",
  ADMIN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  STAFF: "border-sky-500/30 bg-sky-500/10 text-sky-300",
};

export function AdminsManager({
  admins,
  currentAdminId,
}: {
  admins: Admin[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "ADMIN" as AdminRole,
  });
  const [removeTarget, setRemoveTarget] = useState<Admin | null>(null);

  function add() {
    startTransition(async () => {
      const res = await createAdminAction(form);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to add admin");
        return;
      }
      toast.success("Admin added");
      setForm({ email: "", password: "", role: "ADMIN" });
      router.refresh();
    });
  }

  function remove() {
    if (!removeTarget) return;
    startTransition(async () => {
      const res = await revokeAdminAction(removeTarget.id);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to remove admin");
        return;
      }
      toast.success("Admin removed");
      setRemoveTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 font-display font-semibold text-white">
          Add administrator
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Input
            label="Email"
            type="email"
            placeholder="admin@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Temporary password"
            type="text"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as AdminRole })
              }
            >
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </select>
          </div>
          <Button variant="gold" onClick={add} loading={pending}>
            <UserPlus className="h-4 w-4" /> Add
          </Button>
        </div>
        <p className="mt-3 text-xs text-white/40">
          The account is created with a confirmed email. Share the temporary
          password securely and have them change it after first login.
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Added</th>
              <th className="p-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-white/5">
                <td className="p-4 font-medium text-white">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    {a.email}
                    {a.id === currentAdminId && (
                      <span className="text-xs text-white/40">(you)</span>
                    )}
                  </span>
                </td>
                <td className="p-4">
                  <Badge className={ROLE_STYLES[a.role]}>{a.role}</Badge>
                </td>
                <td className="p-4 text-white/60">{formatDate(a.created_at)}</td>
                <td className="p-4 text-right">
                  {a.id !== currentAdminId && (
                    <button
                      onClick={() => setRemoveTarget(a)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                      title="Remove admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove admin?"
      >
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Remove admin access for{" "}
              <span className="font-semibold text-white">
                {removeTarget.email}
              </span>
              ? Their login account remains, but they will lose admin
              privileges.
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
                loading={pending}
                onClick={remove}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
