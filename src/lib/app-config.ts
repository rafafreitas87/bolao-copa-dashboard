import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function getBooleanConfig(key: string, fallback = false) {
  if (!hasSupabaseEnv()) {
    return fallback;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("configs")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || data?.value === undefined || data.value === null) {
    return fallback;
  }

  return Boolean(data.value);
}

export async function setBooleanConfig(key: string, value: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("configs")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }
}
