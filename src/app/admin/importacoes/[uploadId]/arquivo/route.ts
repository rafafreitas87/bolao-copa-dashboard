import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getDevUpload } from "@/lib/dev-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type UploadFileRouteProps = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function GET(_request: Request, { params }: UploadFileRouteProps) {
  const { uploadId } = await params;
  const upload = hasSupabaseEnv() ? await getSupabaseUpload(uploadId) : await getDevUpload(uploadId);

  if (!upload) {
    return new NextResponse("Upload nao encontrado", { status: 404 });
  }

  let bytes: Buffer;

  try {
    bytes = hasSupabaseEnv()
      ? await readSupabaseUploadBytes(upload.storagePath)
      : await readFile(upload.storagePath);
  } catch {
    return new NextResponse("Arquivo nao encontrado", { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": upload.fileType === "PDF" ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(upload.fileName)}"`,
    },
  });
}

async function getSupabaseUpload(uploadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, participant_id, file_name, file_type, storage_path, uploaded_at, status")
    .eq("id", uploadId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    participantId: data.participant_id,
    fileName: data.file_name,
    fileType: data.file_type,
    storagePath: data.storage_path,
    uploadedAt: data.uploaded_at,
    status: "UPLOADED" as const,
  };
}

async function readSupabaseUploadBytes(storagePath: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("bolao-uploads").download(storagePath);

  if (error) {
    throw new Error(error.message);
  }

  return Buffer.from(await data.arrayBuffer());
}
