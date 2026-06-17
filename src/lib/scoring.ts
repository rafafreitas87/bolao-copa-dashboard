import type { DevParticipant, DevPrediction, DevResult } from "@/lib/dev-store";

export type PredictionScore = {
  points: number;
  exactScore: boolean;
  correctOutcome: boolean;
  wrong: boolean;
};

export type RankingRow = {
  participantId: string;
  participantName: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  wrongPredictions: number;
  scoredPredictions: number;
  totalPredictions: number;
};

type ScoreInput = {
  predictedScoreA: number;
  predictedScoreB: number;
  officialScoreA: number;
  officialScoreB: number;
};

export function calculatePredictionScore(input: ScoreInput): PredictionScore {
  const exactScore =
    input.predictedScoreA === input.officialScoreA &&
    input.predictedScoreB === input.officialScoreB;
  const correctOutcome =
    !exactScore &&
    getOutcome(input.predictedScoreA, input.predictedScoreB) ===
      getOutcome(input.officialScoreA, input.officialScoreB);

  return {
    points: exactScore ? 3 : correctOutcome ? 1 : 0,
    exactScore,
    correctOutcome,
    wrong: !exactScore && !correctOutcome,
  };
}

export function buildRanking(
  participants: DevParticipant[],
  predictions: DevPrediction[],
  results: DevResult[],
) {
  const resultByMatchNumber = new Map(results.map((result) => [result.matchNumber, result]));
  const predictionsByParticipant = groupBy(predictions, (prediction) => prediction.participantId);

  return participants
    .filter((participant) => participant.active)
    .map<RankingRow>((participant) => {
      const participantPredictions = predictionsByParticipant.get(participant.id) ?? [];
      let totalPoints = 0;
      let exactScores = 0;
      let correctOutcomes = 0;
      let wrongPredictions = 0;
      let scoredPredictions = 0;

      for (const prediction of participantPredictions) {
        const result = resultByMatchNumber.get(prediction.matchNumber);

        if (!result) {
          continue;
        }

        scoredPredictions += 1;
        const score = calculatePredictionScore({
          predictedScoreA: prediction.predictedScoreA,
          predictedScoreB: prediction.predictedScoreB,
          officialScoreA: result.officialScoreA,
          officialScoreB: result.officialScoreB,
        });

        totalPoints += score.points;
        exactScores += score.exactScore ? 1 : 0;
        correctOutcomes += score.correctOutcome ? 1 : 0;
        wrongPredictions += score.wrong ? 1 : 0;
      }

      return {
        participantId: participant.id,
        participantName: participant.displayName,
        totalPoints,
        exactScores,
        correctOutcomes,
        wrongPredictions,
        scoredPredictions,
        totalPredictions: participantPredictions.length,
      };
    })
    .sort((a, b) => {
      return (
        b.totalPoints - a.totalPoints ||
        b.exactScores - a.exactScores ||
        b.correctOutcomes - a.correctOutcomes ||
        a.wrongPredictions - b.wrongPredictions ||
        a.participantName.localeCompare(b.participantName)
      );
    });
}

function getOutcome(scoreA: number, scoreB: number) {
  if (scoreA > scoreB) {
    return "A";
  }

  if (scoreB > scoreA) {
    return "B";
  }

  return "D";
}

function groupBy<T>(rows: T[], getKey: (row: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return grouped;
}
