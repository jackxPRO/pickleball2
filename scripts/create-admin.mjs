// Creates (or promotes) an administrator account using the Supabase service role.
// Usage:
//   node scripts/create-admin.mjs <email> <password> [role]
// Example:
//   node scripts/create-admin.mjs admin@5pointpickleball.com "Jason@11" SUPER_ADMIN
//
// Reads credentials from .env.local. SUPABASE_SERVICE_ROLE_KEY is required.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path = ".env.local") {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // ignore — env may already be set
  }
}

loadEnv();

const [email, password, roleArg] = process.argv.slice(2);
const role = roleArg || "SUPER_ADMIN";

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [role]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  // Paginate through users (small installs — a few pages max).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  let userId;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Administrator" },
  });

  if (createErr) {
    if (/already been registered|already exists/i.test(createErr.message)) {
      const existing = await findUserByEmail(email);
      if (!existing) throw createErr;
      userId = existing.id;
      // Ensure the password matches what was requested.
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      console.log("• Auth user already existed — password reset & confirmed.");
    } else {
      throw createErr;
    }
  } else {
    userId = created.user.id;
    console.log("• Auth user created and email confirmed.");
  }

  // Upsert the admins row (unique on auth_id).
  const { error: adminErr } = await admin
    .from("admins")
    .upsert({ auth_id: userId, email, role }, { onConflict: "auth_id" });
  if (adminErr) throw adminErr;

  console.log(`✅ ${email} is now ${role}.`);
}

main().catch((e) => {
  console.error("❌ Failed:", e.message || e);
  process.exit(1);
});
