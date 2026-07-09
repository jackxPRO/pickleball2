// One-off: refresh the "Can I cancel a booking?" FAQ with the current policy.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2];
}

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const cancelAnswer =
  "Yes, from My Bookings. Please note two rules: you can cancel a maximum of 3 bookings per day, and a booking cannot be cancelled within 1 hour of its scheduled start time. When cancelled within the rules, the full amount is automatically refunded to your wallet.";

const { data: row } = await s
  .from("website_settings")
  .select("id, faqs")
  .limit(1)
  .single();

const faqs = Array.isArray(row.faqs) ? [...row.faqs] : [];
const isCancel = (f) =>
  f && typeof f.question === "string" &&
  f.question.toLowerCase().includes("cancel");

let found = false;
for (let i = 0; i < faqs.length; i++) {
  if (isCancel(faqs[i])) {
    faqs[i] = { question: "Can I cancel a booking?", answer: cancelAnswer };
    found = true;
  }
}
if (!found) {
  faqs.push({ question: "Can I cancel a booking?", answer: cancelAnswer });
}

const { error } = await s
  .from("website_settings")
  .update({ faqs })
  .eq("id", row.id);

console.log(error ? "ERROR: " + error.message : `OK (${faqs.length} FAQs)`);
