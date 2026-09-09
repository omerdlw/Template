import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  requireSupabasePublicConfig,
  requireSupabaseSecretKey,
} from "@/infrastructure/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = requireSupabasePublicConfig();

  return createServerClient(url, publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

export function createAdminSupabaseClient() {
  const { url } = requireSupabasePublicConfig();

  return createClient(url, requireSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      experimental: { passkey: true },
      persistSession: false,
    },
  });
}
