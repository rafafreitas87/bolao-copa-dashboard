import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";
import type { DetectedPdfPrediction } from "./parse-upload";

const imageMimeByExtension = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

export type VisionExtractionResult = {
  predictions: DetectedPdfPrediction[];
  message?: string;
};

type VisionPrediction = {
  matchNumber?: unknown;
  teamA?: unknown;
  teamB?: unknown;
  scoreA?: unknown;
  scoreB?: unknown;
};

export async function extractPredictionsWithVision(input: {
  fileName: string;
  bytes: Buffer;
}): Promise<VisionExtractionResult> {
  try {
    return await extractPredictionsWithVisionUnsafe(input);
  } catch (error) {
    return {
      predictions: [],
      message:
        error instanceof Error
          ? `OCR por IA falhou: ${error.message}`
          : "OCR por IA falhou ao processar o arquivo.",
    };
  }
}

async function extractPredictionsWithVisionUnsafe(input: {
  fileName: string;
  bytes: Buffer;
}): Promise<VisionExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      predictions: [],
      message: "OPENAI_API_KEY nao configurada. Use digitacao manual ou configure OCR por IA.",
    };
  }

  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";
  const uploadedFileId = extension === "pdf" ? await uploadOpenAIFile(apiKey, input) : null;
  const fileContent = uploadedFileId
    ? { type: "input_file", file_id: uploadedFileId }
    : buildImageContent(extension, input.bytes);

  if (!fileContent) {
    return {
      predictions: [],
      message: "Formato sem suporte para OCR por IA.",
    };
  }

  const fixtures = await getGroupStageFixtures();
  const fixtureText = fixtures
    .map((fixture) => `${fixture.matchNumber}. ${fixture.homeTeam} x ${fixture.awayTeam}`)
    .join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_OCR_MODEL || "gpt-4.1-mini",
        temperature: 0,
        input: [
          {
            role: "user",
            content: [
              fileContent,
              {
                type: "input_text",
                text: [
                  "Leia este arquivo de bolao preenchido a mao ou escaneado.",
                  "Extraia somente os placares apostados pelo participante.",
                  "Use a lista oficial de jogos abaixo para identificar o numero do jogo.",
                  "Responda APENAS JSON valido neste formato:",
                  '{"predictions":[{"matchNumber":1,"teamA":"Mexico","scoreA":1,"scoreB":0,"teamB":"South Africa"}]}',
                  "Se algum jogo estiver ilegivel, omita esse jogo.",
                  "",
                  "Jogos oficiais:",
                  fixtureText,
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        predictions: [],
        message: await buildOpenAIErrorMessage(response),
      };
    }

    const payload = (await response.json()) as { output_text?: string };
    const outputText = payload.output_text ?? extractOutputText(payload);
    const parsed = parseVisionJson(outputText);

    if (!parsed) {
      return {
        predictions: [],
        message: "OCR por IA nao retornou JSON valido para revisao.",
      };
    }

    return {
      predictions: normalizeVisionPredictions(parsed.predictions ?? []),
    };
  } finally {
    if (uploadedFileId) {
      await deleteOpenAIFile(apiKey, uploadedFileId);
    }
  }
}

function buildImageContent(extension: string, bytes: Buffer) {
  const mimeType = imageMimeByExtension.get(extension);

  if (!mimeType) {
    return null;
  }

  const base64 = bytes.toString("base64");

  return {
    type: "input_image",
    image_url: `data:${mimeType};base64,${base64}`,
  };
}

async function uploadOpenAIFile(
  apiKey: string,
  input: {
    fileName: string;
    bytes: Buffer;
  },
) {
  const formData = new FormData();
  formData.set("purpose", "user_data");
  formData.set(
    "file",
    new Blob([new Uint8Array(input.bytes)], { type: "application/pdf" }),
    input.fileName,
  );

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await buildOpenAIErrorMessage(response));
  }

  const payload = (await response.json()) as { id?: string };

  if (!payload.id) {
    throw new Error("upload do PDF nao retornou file_id");
  }

  return payload.id;
}

async function buildOpenAIErrorMessage(response: Response) {
  const bodyMessage = await readOpenAIErrorBody(response);

  if (response.status === 429) {
    return [
      "OCR por IA falhou: limite da OpenAI atingido (429 Too Many Requests).",
      "Aguarde um pouco e tente novamente; se continuar, confira creditos/billing e limite do projeto na OpenAI.",
      "PDF escaneado grande tambem pode consumir muito limite de visao.",
      bodyMessage,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [`OCR por IA falhou: ${response.status} ${response.statusText}.`, bodyMessage]
    .filter(Boolean)
    .join(" ");
}

async function readOpenAIErrorBody(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };

    return payload.error?.message ?? "";
  } catch {
    return "";
  }
}

async function deleteOpenAIFile(apiKey: string, fileId: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch {
    // Best effort cleanup; the review flow should not fail because cleanup failed.
  }
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const output = (payload as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const content = (item as { content?: unknown }).content;

      if (!Array.isArray(content)) {
        return [];
      }

      return content
        .map((part) => {
          if (!part || typeof part !== "object") {
            return "";
          }

          return String((part as { text?: unknown }).text ?? "");
        })
        .filter(Boolean);
    })
    .join("\n");
}

function parseVisionJson(outputText: string) {
  const trimmed = outputText.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText) as { predictions?: VisionPrediction[] };
  } catch {
    return null;
  }
}

function normalizeVisionPredictions(predictions: VisionPrediction[]) {
  const rows = new Map<number, DetectedPdfPrediction>();

  for (const prediction of predictions) {
    const matchNumber = toInteger(prediction.matchNumber);
    const predictedScoreA = toInteger(prediction.scoreA);
    const predictedScoreB = toInteger(prediction.scoreB);
    const teamA = toCleanText(prediction.teamA);
    const teamB = toCleanText(prediction.teamB);

    if (
      !matchNumber ||
      matchNumber < 1 ||
      matchNumber > 72 ||
      predictedScoreA === null ||
      predictedScoreB === null ||
      !teamA ||
      !teamB
    ) {
      continue;
    }

    rows.set(matchNumber, {
      matchNumber,
      dateLabel: "",
      teamA,
      predictedScoreA,
      predictedScoreB,
      teamB,
    });
  }

  return [...rows.values()].sort((a, b) => a.matchNumber - b.matchNumber);
}

function toInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(number) && number >= 0 ? number : null;
}

function toCleanText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}
