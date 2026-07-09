"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { wipeDatabaseAction } from "@/app/admin/danger/actions";

export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const canSubmit = confirm === "DELETE" && password.length > 0;

  function submit() {
    startTransition(async () => {
      const res = await wipeDatabaseAction({ password, confirm });
      if (!res.ok) {
        toast.error(res.error ?? "Failed to wipe data");
        return;
      }
      toast.success(
        `All data wiped${
          res.deletedUsers ? ` · ${res.deletedUsers} accounts removed` : ""
        }.`
      );
      setOpen(false);
      setPassword("");
      setConfirm("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-red-500/15 p-3">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-white">
            Delete all data
          </h3>
          <p className="mt-1 text-sm text-white/60">
            Permanently deletes all customers, bookings, wallet balances &amp;
            history, top-ups, notifications, gallery images, and announcements.
            Admin accounts, courts, pricing, and website settings are kept.
            <span className="mt-1 block font-medium text-red-400">
              This cannot be undone.
            </span>
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete all data
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm data deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This will permanently erase all operational data. This action is
            irreversible.
          </div>

          <Input
            label="Your admin password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <Input
            label={'Type "DELETE" to confirm'}
            placeholder="DELETE"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={!canSubmit}
              loading={pending}
              onClick={submit}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
