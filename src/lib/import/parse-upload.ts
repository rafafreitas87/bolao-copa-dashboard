import { read, utils } from "xlsx";
import type { DevUpload } from "@/lib/dev-store";
import { extractPredictionsWithVision } from "./vision-ocr";

type PdfParse = (bytes: Buffer) => Promise<{ text: string }>;
const maxAutomaticVisionBytes = Number(process.env.OPENAI_OCR_MAX_BYTES ?? 6_000_000);

export type ParsedUploadPreview =
  | {
      kind: "excel";
      sheets: Array<{
        name: string;
        rows: unknown[][];
      }>;
      detectedPredictions: DetectedPdfPrediction[];
    }
  | {
      kind: "pdf";
      text: string;
      lines: string[];
      detectedPredictions: DetectedPdfPrediction[];
      errorMessage?: string;
      ocrMessage?: string;
      detectedByVision: boolean;
    }
  | {
      kind: "image";
      detectedPredictions: DetectedPdfPrediction[];
      errorMessage?: string;
      ocrMessage?: string;
      detectedByVision: boolean;
    }
  | {
      kind: "unsupported";
      message: string;
    };

export type DetectedPdfPrediction = {
  matchNumber: number;
  dateLabel: string;
  teamA: string;
  predictedScoreA: number;
  predictedScoreB: number;
  teamB: string;
};

export async function parseUploadPreview(
  upload: DevUpload,
  bytes: Buffer,
  options: { skipVision?: boolean } = {},
): Promise<ParsedUploadPreview> {
  const extension = upload.fileName.split(".").pop()?.toLowerCase();

  if (extension === "xls" || extension === "xlsx") {
    const workbook = read(bytes, { type: "buffer" });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
        header: 1,
        blankrows: false,
      }),
    }));

    return {
      kind: "excel",
      sheets: sheets.map((sheet) => ({
        name: sheet.name,
        rows: sheet.rows.slice(0, 40),
      })),
      detectedPredictions: detectExcelPredictions(sheets.flatMap((sheet) => sheet.rows)),
    };
  }

  if (extension === "pdf") {
    let text = "";
    let errorMessage: string | undefined;

    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as PdfParse;
      const parsed = await pdfParse(bytes);
      text = parsed.text.trim();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Nao foi possivel extrair texto.";
    }

    let detectedPredictions = detectPdfPredictions(text);
    let ocrMessage: string | undefined;
    let detectedByVision = false;

    if (detectedPredictions.length === 0) {
      if (options.skipVision) {
        ocrMessage = "OCR/IA ignorado porque este upload ja tem palpites salvos.";
      } else if (bytes.length > maxAutomaticVisionBytes) {
        ocrMessage =
          "Arquivo grande para OCR automatico. A revisao manual foi aberta para evitar queda da pagina.";
      } else {
        const vision = await extractPredictionsWithVision({
          fileName: upload.fileName,
          bytes,
        });
        detectedPredictions = vision.predictions;
        ocrMessage = vision.message;
        detectedByVision = vision.predictions.length > 0;
      }
    }

    return {
      kind: "pdf",
      text,
      lines: text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 120),
      detectedPredictions,
      errorMessage,
      ocrMessage,
      detectedByVision,
    };
  }

  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    const vision =
      options.skipVision
        ? {
            predictions: [],
            message: "OCR/IA ignorado porque este upload ja tem palpites salvos.",
          }
        : bytes.length > maxAutomaticVisionBytes
        ? {
            predictions: [],
            message:
              "Imagem grande para OCR automatico. Reduza o arquivo ou use digitacao manual.",
          }
        : await extractPredictionsWithVision({
            fileName: upload.fileName,
            bytes,
          });

    return {
      kind: "image",
      detectedPredictions: vision.predictions,
      ocrMessage: vision.message,
      detectedByVision: vision.predictions.length > 0,
    };
  }

  return {
    kind: "unsupported",
    message: "Formato nao suportado. Use PDF, XLS, XLSX, JPG, PNG ou WEBP.",
  };
}

function detectPdfPredictions(text: string) {
  const compactText = text
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/JOGODATA|PTS|BOLÃO DA COPA DO MUNDO 2026 - BOLÃO DO XANDÃO/gi, " ");
  const tokenPattern = /(\d{1,2})\s*(\d{2}(?:-|\/)[A-Za-zÀ-ÖØ-öø-ÿ]{3}\.?)/g;
  const tokens = [...compactText.matchAll(tokenPattern)]
    .map((match) => ({
      index: match.index ?? 0,
      matchNumber: Number(match[1]),
      dateLabel: match[2],
      raw: match[0],
    }))
    .filter((token) => token.matchNumber >= 1 && token.matchNumber <= 72)
    .sort((a, b) => a.index - b.index);

  const predictions: DetectedPdfPrediction[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];
    const segment = compactText
      .slice(token.index + token.raw.length, nextToken?.index)
      .trim();
    const prediction = parsePredictionSegment(token.matchNumber, token.dateLabel, segment);

    if (prediction) {
      predictions.push(prediction);
    }
  }

  return predictions.sort((a, b) => a.matchNumber - b.matchNumber);
}

function detectExcelPredictions(rows: unknown[][]) {
  const predictions = new Map<number, DetectedPdfPrediction>();

  for (const row of rows) {
    for (let cellIndex = 0; cellIndex < row.length; cellIndex += 1) {
      const matchNumber = toMatchNumber(row[cellIndex]);

      if (!matchNumber) {
        continue;
      }

      const structuredPrediction = parseExcelStructuredPrediction(row, cellIndex, matchNumber);

      if (structuredPrediction) {
        predictions.set(matchNumber, structuredPrediction);
      }
    }

    const linePredictions = detectPdfPredictions(row.map((cell) => String(cell ?? "")).join(" "));

    for (const prediction of linePredictions) {
      predictions.set(prediction.matchNumber, prediction);
    }
  }

  return [...predictions.values()].sort((a, b) => a.matchNumber - b.matchNumber);
}

function parseExcelStructuredPrediction(
  row: unknown[],
  startIndex: number,
  matchNumber: number,
): DetectedPdfPrediction | null {
  const teamA = toText(row[startIndex + 2]);
  const scoreA = toScore(row[startIndex + 3]);
  const separator = toText(row[startIndex + 4]).toUpperCase();
  const scoreB = toScore(row[startIndex + 5]);
  const teamB = toText(row[startIndex + 6]);

  if (!teamA || scoreA === null || separator !== "X" || scoreB === null || !teamB) {
    return null;
  }

  return {
    matchNumber,
    dateLabel: toDateLabel(row[startIndex + 1]),
    teamA: cleanTeamName(teamA),
    predictedScoreA: scoreA,
    predictedScoreB: scoreB,
    teamB: cleanTeamName(teamB),
  };
}

function parsePredictionSegment(
  matchNumber: number,
  dateLabel: string,
  segment: string,
): DetectedPdfPrediction | null {
  const match = segment.match(/^(.+?)(\d+)\s*X\s*(\d+)(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    matchNumber,
    dateLabel,
    teamA: cleanTeamName(match[1]),
    predictedScoreA: Number(match[2]),
    predictedScoreB: Number(match[3]),
    teamB: cleanTeamName(match[4]),
  };
}

function cleanTeamName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toMatchNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(number) && number >= 1 && number <= 72 ? number : null;
}

function toScore(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(number) && number >= 0 ? number : null;
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toDateLabel(value: unknown) {
  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  }

  return toText(value);
}
