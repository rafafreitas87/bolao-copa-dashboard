import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getDevUpload } from "@/lib/dev-store";

type UploadFileRouteProps = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function GET(_request: Request, { params }: UploadFileRouteProps) {
  const { uploadId } = await params;
  const upload = await getDevUpload(uploadId);

  if (!upload) {
    return new NextResponse("Upload nao encontrado", { status: 404 });
  }

  const bytes = await readFile(upload.storagePath);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": upload.fileType === "PDF" ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(upload.fileName)}"`,
    },
  });
}
