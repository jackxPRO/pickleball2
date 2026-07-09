"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import type { PricingRule } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RULE_TYPES = ["STANDARD", "WEEKDAY", "WEEKEND", "HOLIDAY", "PROMO"];

export function PricingManager({ rules }: { rules: PricingRule[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    name: "",
    rule_type: "STANDARD",
    start_time: "07:00",
    end_time: "16:00",
    rate: "150",
    discount_pct: "0",
  });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!form.name) {
      toast.error("Enter a name");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("pricing_rules").insert({
        name: form.name,
        rule_type: form.rule_type,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        rate: Number(form.rate),
        discount_pct: Number(form.discount_pct) || 0,
        active: true,
      });
      if (error) throw error;
      toast.success("Rule added");
      setForm({ ...form, name: "" });
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(rule: PricingRule) {
    await supabase
      .from("pricing_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    router.refresh();
  }

  async function remove(id: string) {
    await supabase.from("pricing_rules").delete().eq("id", id);
    toast.success("Rule removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 font-display font-semibold text-white">Add rule</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Name"
            placeholder="Weekend Rate"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.rule_type}
              onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
            >
              {RULE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Rate (₱)"
            type="number"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />
          <Input
            label="Start time"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            label="End time"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
          <Input
            label="Discount %"
            type="number"
            value={form.discount_pct}
            onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
          />
        </div>
        <Button variant="gold" className="mt-4" onClick={add} loading={busy}>
          <Plus className="h-4 w-4" /> Add rule
        </Button>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Window</th>
              <th className="p-4 text-right font-medium">Rate</th>
              <th className="p-4 font-medium">Active</th>
              <th className="p-4 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="p-4 font-medium text-white">{r.name}</td>
                <td className="p-4 text-white/60">{r.rule_type}</td>
                <td className="p-4 text-white/60">
                  {r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}
                </td>
                <td className="p-4 text-right text-white">₱{r.rate}</td>
                <td className="p-4">
                  <button
                    onClick={() => toggle(r)}
                    className={
                      r.active
                        ? "badge border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "badge border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                    }
                  >
                    {r.active ? "Active" : "Off"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
