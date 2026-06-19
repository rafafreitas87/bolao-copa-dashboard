"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { setBooleanConfig } from "@/lib/app-config";

export async function saveAdminSettings(formData: FormData) {
  await requireAdmin();

  const correctionRequestsEnabled = formData.get("correctionRequestsEnabled") === "on";

  try {
    await setBooleanConfig("correction_requests_enabled", correctionRequestsEnabled);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar configuracoes";
    redirect(`/admin/configuracoes?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/configuracoes?saved=1");
}
