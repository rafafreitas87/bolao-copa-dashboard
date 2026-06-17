import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type DevParticipant = {
  id: string;
  name: string;
  displayName: string;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DevUpload = {
  id: string;
  participantId: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  uploadedAt: string;
  status: "UPLOADED";
};

export type DevResult = {
  matchNumber: number;
  officialScoreA: number;
  officialScoreB: number;
  status: "FINISHED";
  updatedAt: string;
};

export type DevPrediction = {
  id: string;
  participantId: string;
  uploadId: string;
  matchNumber: number;
  teamA: string;
  teamB: string;
  predictedScoreA: number;
  predictedScoreB: number;
  sourceFileName: string;
  confirmedAt: string;
};

const dataDir = path.join(process.cwd(), ".dev-data");
const uploadDir = path.join(dataDir, "uploads");
const participantsPath = path.join(dataDir, "participants.json");
const uploadsPath = path.join(dataDir, "uploads.json");
const resultsPath = path.join(dataDir, "results.json");
const predictionsPath = path.join(dataDir, "predictions.json");

export async function listDevParticipants() {
  return readJson<DevParticipant[]>(participantsPath, []);
}

export async function createDevParticipant(input: {
  name: string;
  displayName: string;
  email?: string | null;
}) {
  const now = new Date().toISOString();
  const participants = await listDevParticipants();
  const participant: DevParticipant = {
    id: crypto.randomUUID(),
    name: input.name,
    displayName: input.displayName,
    email: input.email || null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  participants.push(participant);
  await writeJson(participantsPath, participants);
  return participant;
}

export async function upsertDevParticipants(
  inputs: Array<{
    name: string;
    displayName: string;
    email?: string | null;
  }>,
) {
  const now = new Date().toISOString();
  const participants = await listDevParticipants();
  const participantByNormalizedName = new Map(
    participants.map((participant) => [normalizeName(participant.displayName), participant]),
  );

  for (const input of inputs) {
    const normalizedName = normalizeName(input.displayName);
    const existing = participantByNormalizedName.get(normalizedName);

    if (existing) {
      existing.name = input.name;
      existing.displayName = input.displayName;
      existing.email = input.email || existing.email;
      existing.active = true;
      existing.updatedAt = now;
      continue;
    }

    const participant: DevParticipant = {
      id: crypto.randomUUID(),
      name: input.name,
      displayName: input.displayName,
      email: input.email || null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    participants.push(participant);
    participantByNormalizedName.set(normalizedName, participant);
  }

  await writeJson(participantsPath, participants);
  return participants;
}

export async function listDevUploads() {
  return readJson<DevUpload[]>(uploadsPath, []);
}

export async function getDevUpload(id: string) {
  const uploads = await listDevUploads();
  return uploads.find((upload) => upload.id === id) ?? null;
}

export async function createDevUpload(input: {
  participantId: string;
  fileName: string;
  fileType: string;
  bytes: ArrayBuffer;
}) {
  await mkdir(uploadDir, { recursive: true });

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = path.join(uploadDir, `${id}-${safeName}`);
  const uploads = await listDevUploads();

  await writeFile(storagePath, Buffer.from(input.bytes));

  const upload: DevUpload = {
    id,
    participantId: input.participantId,
    fileName: input.fileName,
    fileType: input.fileType,
    storagePath,
    uploadedAt: now,
    status: "UPLOADED",
  };

  uploads.push(upload);
  await writeJson(uploadsPath, uploads);
  return upload;
}

export async function markDevUploadConfirmed(uploadId: string) {
  const uploads = await listDevUploads();
  const upload = uploads.find((row) => row.id === uploadId);

  if (!upload) {
    return null;
  }

  upload.status = "UPLOADED";
  await writeJson(uploadsPath, uploads);
  return upload;
}

export async function readDevUploadBytes(upload: DevUpload) {
  return readFile(upload.storagePath);
}

export async function listDevResults() {
  return readJson<DevResult[]>(resultsPath, []);
}

export async function listDevPredictions() {
  return readJson<DevPrediction[]>(predictionsPath, []);
}

export async function getDevPredictionsByUpload(uploadId: string) {
  const predictions = await listDevPredictions();
  return predictions.filter((prediction) => prediction.uploadId === uploadId);
}

export async function getDevPredictionsByParticipant(participantId: string) {
  const predictions = await listDevPredictions();
  return predictions
    .filter((prediction) => prediction.participantId === participantId)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

export async function saveDevPredictionsForUpload(input: {
  upload: DevUpload;
  participantId: string;
  predictions: Array<{
    matchNumber: number;
    teamA: string;
    teamB: string;
    predictedScoreA: number;
    predictedScoreB: number;
  }>;
}) {
  const now = new Date().toISOString();
  const existingPredictions = await listDevPredictions();
  const remainingPredictions = existingPredictions.filter(
    (prediction) =>
      !(
        prediction.participantId === input.participantId &&
        input.predictions.some((row) => row.matchNumber === prediction.matchNumber)
      ),
  );

  const nextPredictions: DevPrediction[] = input.predictions.map((prediction) => ({
    id: crypto.randomUUID(),
    participantId: input.participantId,
    uploadId: input.upload.id,
    matchNumber: prediction.matchNumber,
    teamA: prediction.teamA,
    teamB: prediction.teamB,
    predictedScoreA: prediction.predictedScoreA,
    predictedScoreB: prediction.predictedScoreB,
    sourceFileName: input.upload.fileName,
    confirmedAt: now,
  }));

  await writeJson(predictionsPath, [...remainingPredictions, ...nextPredictions]);
  return nextPredictions;
}

export async function saveDevPredictionsForParticipant(input: {
  participantId: string;
  uploadId?: string;
  sourceFileName?: string;
  predictions: Array<{
    matchNumber: number;
    teamA: string;
    teamB: string;
    predictedScoreA: number;
    predictedScoreB: number;
  }>;
}) {
  const now = new Date().toISOString();
  const existingPredictions = await listDevPredictions();
  const remainingPredictions = existingPredictions.filter(
    (prediction) => prediction.participantId !== input.participantId,
  );

  const nextPredictions: DevPrediction[] = input.predictions.map((prediction) => ({
    id: crypto.randomUUID(),
    participantId: input.participantId,
    uploadId: input.uploadId ?? "MANUAL",
    matchNumber: prediction.matchNumber,
    teamA: prediction.teamA,
    teamB: prediction.teamB,
    predictedScoreA: prediction.predictedScoreA,
    predictedScoreB: prediction.predictedScoreB,
    sourceFileName: input.sourceFileName ?? "Digitacao manual",
    confirmedAt: now,
  }));

  await writeJson(predictionsPath, [...remainingPredictions, ...nextPredictions]);
  return nextPredictions;
}

export async function resetAllDevPredictions() {
  await writeJson(predictionsPath, []);
}

export async function saveDevResult(input: {
  matchNumber: number;
  officialScoreA: number;
  officialScoreB: number;
}) {
  const results = await listDevResults();
  const now = new Date().toISOString();
  const nextResult: DevResult = {
    matchNumber: input.matchNumber,
    officialScoreA: input.officialScoreA,
    officialScoreB: input.officialScoreB,
    status: "FINISHED",
    updatedAt: now,
  };
  const nextResults = [
    ...results.filter((result) => result.matchNumber !== input.matchNumber),
    nextResult,
  ].sort((a, b) => a.matchNumber - b.matchNumber);

  await writeJson(resultsPath, nextResults);
  return nextResult;
}

async function readJson<T>(filePath: string, fallback: T) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}
