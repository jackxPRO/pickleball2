"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatCurrency, formatTime } from "@/lib/utils";
import type { Booking, Court } from "@/types/database";
import { Card } from "@/components/ui/card";

type View = "Day" | "Week" | "Month";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function BookingCalendar({
  bookings,
  courts,
}: {
  bookings: Booking[];
  courts: Court[];
}) {
  const [view, setView] = useState<View>("Week");
  const [cursor, setCursor] = useState(new Date());
  const [courtId, setCourtId] = useState<string>("ALL");

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings
      .filter((b) => courtId === "ALL" || b.court_id === courtId)
      .forEach((b) => {
        const arr = map.get(b.booking_date) ?? [];
        arr.push(b);
        map.set(b.booking_date, arr);
      });
    map.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [bookings, courtId]);

  function move(dir: number) {
    const step = view === "Day" ? 1 : view === "Week" ? 7 : 30;
    setCursor((c) => addDays(c, dir * step));
  }

  const days = useMemo(() => {
    if (view === "Day") return [cursor];
    if (view === "Week") {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    // Month
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const label = cursor.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    ...(view === "Day" ? { day: "numeric" } : {}),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10">
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <span className="min-w-40 text-center font-display font-semibold text-white">
            {label}
          </span>
          <button onClick={() => move(1)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10">
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
          <button onClick={() => setCursor(new Date())} className="btn-outline py-1.5 text-xs">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            className="input w-auto py-1.5 text-sm"
          >
            <option value="ALL">All courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-white/10 p-0.5">
            {(["Day", "Week", "Month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition",
                  view === v ? "bg-secondary text-black" : "text-white/70"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "Month" ? (
        <Card className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/40">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = iso(day);
              const list = byDate.get(key) ?? [];
              const isOtherMonth = day.getMonth() !== cursor.getMonth();
              const isToday = key === iso(new Date());
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-20 rounded-lg border border-white/5 p-1.5 text-left",
                    isOtherMonth && "opacity-40",
                    isToday && "border-secondary/50 bg-secondary/5"
                  )}
                >
                  <span className="text-xs text-white/60">{day.getDate()}</span>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((b) => (
                      <div key={b.id} className="truncate rounded bg-primary-light/30 px-1 py-0.5 text-[10px] text-white">
                        {formatTime(b.start_time)} {b.courts?.name}
                      </div>
                    ))}
                    {list.length > 3 && (
                      <span className="text-[10px] text-secondary">+{list.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className={cn("grid gap-3", view === "Week" ? "sm:grid-cols-2 lg:grid-cols-7" : "")}>
          {days.map((day) => {
            const key = iso(day);
            const list = byDate.get(key) ?? [];
            const isToday = key === iso(new Date());
            return (
              <Card key={key} className={cn("p-4", isToday && "border-secondary/50")}>
                <p className="font-display text-sm font-semibold text-white">
                  {day.toLocaleDateString("en-PH", { weekday: "short", day: "numeric" })}
                </p>
                <div className="mt-3 space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-white/40">No bookings</p>
                  ) : (
                    list.map((b) => (
                      <div key={b.id} className="rounded-lg border border-white/5 bg-white/5 p-2">
                        <p className="text-xs font-medium text-white">
                          {formatTime(b.start_time)}–{formatTime(b.end_time)}
                        </p>
                        <p className="text-xs text-secondary">{b.courts?.name}</p>
                        <p className="truncate text-[11px] text-white/50">
                          {b.users?.full_name}
                        </p>
                        <p className="text-[11px] text-white/70">
                          {formatCurrency(b.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
