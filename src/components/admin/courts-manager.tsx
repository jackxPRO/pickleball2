"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { courtRepository } from "@/lib/repositories/court.repository";
import { cn, formatCurrency, getErrorMessage } from "@/lib/utils";
import type { Court, CourtStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS: CourtStatus[] = ["ACTIVE", "DISABLED", "MAINTENANCE"];
const STATUS_STYLES: Record<CourtStatus, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  DISABLED: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  MAINTENANCE: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function CourtsManager({ courts }: { courts: Court[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("150");
  const [busy, setBusy] = useState(false);

  async function addCourt() {
    if (!name) {
      toast.error("Enter a court name");
      return;
    }
    setBusy(true);
    try {
      await courtRepository.create(supabase, {
        name,
        hourly_rate: Number(rate) || 150,
        display_order: courts.length + 1,
      });
      toast.success("Court added");
      setName("");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, patch: Partial<Court>) {
    try {
      await courtRepository.update(supabase, id, patch);
      toast.success("Court updated");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 font-display font-semibold text-white">Add court</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Name"
            placeholder="Court 4"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Hourly rate"
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Button variant="gold" onClick={addCourt} loading={busy}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((c) => (
          <Card key={c.id} className="space-y-3">
            <input
              defaultValue={c.name}
              onBlur={(e) =>
                e.target.value !== c.name &&
                update(c.id, { name: e.target.value })
              }
              className="input font-display font-semibold"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">₱</span>
              <input
                type="number"
                defaultValue={c.hourly_rate}
                onBlur={(e) =>
                  Number(e.target.value) !== c.hourly_rate &&
                  update(c.id, { hourly_rate: Number(e.target.value) })
                }
                className="input"
              />
              <span className="whitespace-nowrap text-xs text-white/50">
                / hr
              </span>
            </div>
            <p className="text-xs text-white/40">
              Base rate {formatCurrency(c.hourly_rate)}
            </p>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => update(c.id, { status: s })}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-xs font-medium transition",
                    c.status === s
                      ? STATUS_STYLES[s]
                      : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
