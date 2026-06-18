"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createDevUpload } from "@/lib/dev-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const allowedTypes = new Set(["pdf", "xls", "xlsx"]);

export async function uploadPredictionFile(formData: FormData) {
  const profile = await requireAdmin();
  const participantId = String(formData.get("participantId") ?? "");
  const file = formData.get("file");

  if (!participantId || !(file instanceof File) || file.size === 0) {
    redirect("/admin/importacoes/nova?error=Participante%20e%20arquivo%20sao%20obrigatorios");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedTypes.has(extension)) {
    redirect("/admin/importacoes/nova?error=Use%20PDF,%20XLS%20ou%20XLSX");
  }

  if (!hasSupabaseEnv()) {
    let upload;

    try {
      upload = await createDevUpload({
        participantId,
        fileName: file.name,
        fileType: extension.toUpperCase(),
        bytes: await file.arrayBuffer(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o arquivo no modo demo.";

      redirect(`/admin/importacoes/nova?error=${encodeURIComponent(message)}`);
    }

    redirect(`/admin/importacoes/${upload.id}/revisar`);
  }

  const supabase = createAdminClient();
  const storagePath = `${participantId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: storageError } = await supabase.storage
    .from("bolao-uploads")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
    });

  if (storageError) {
    redirect(`/admin/importacoes/nova?error=${encodeURIComponent(storageError.message)}`);
  }

  const { data: upload, error } = await supabase
    .from("uploads")
    .insert({
      participant_id: participantId,
      uploaded_by_user_id: profile.id,
      file_name: file.name,
      file_type: extension.toUpperCase() as "PDF" | "XLS" | "XLSX",
      storage_path: storagePath,
      status: "UPLOADED",
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/admin/importacoes/nova?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/importacoes/${upload.id}/revisar`);
}
