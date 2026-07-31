// Two Supabase clients:
//   - `supabase` (anon)        : safe to expose; obeys RLS. Use in browser code.
//   - `supabaseAdmin` (service): bypasses RLS. Use ONLY in API routes / server.
//
// Never import supabaseAdmin into a component that renders on the client.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.",
  );
}

export const supabase = createClient(url || "", anonKey || "", {
  auth: { persistSession: false },
});

export function getSupabaseAdmin() {
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing. Server-side Supabase writes are unavailable.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
