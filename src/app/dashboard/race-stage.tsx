"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type RaceRow = {
  participantId: string;
  participantName: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
};

export type RaceDay = {
  date: string;
  label: string;
  leader: RaceRow | null;
  topRows: RaceRow[];
  maxPoints: number;
  calendarProgress: number;
};

type RaceStageProps = {
  days: RaceDay[];
};

const participantColors = [
  "#047857",
  "#2563eb",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#0f766e",
  "#4338ca",
  "#c2410c",
];

export function RaceStage({ days }: RaceStageProps) {
  const [dayIndex, setDayIndex] = useState(Math.max(days.length - 1, 0));
  const [playing, setPlaying] = useState(false);
  const latestDayIndex = Math.max(days.length - 1, 0);
  const currentDay = days[dayIndex];
  const rows = useMemo(() => currentDay?.topRows.slice(0, 8) ?? [], [currentDay]);

  useEffect(() => {
    if (!playing || days.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setDayIndex((current) => {
        if (current >= latestDayIndex) {
          setPlaying(false);
          return latestDayIndex;
        }

        return current + 1;
      });
    }, 1400);

    return () => window.clearInterval(timer);
  }, [days.length, latestDayIndex, playing]);

  if (days.length === 0) {
    return (
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Corrida do ranking</h2>
        <p className="mt-1 text-sm text-slate-600">
          A animacao aparece quando houver palpites aprovados e resultados oficiais.
        </p>
      </section>
    );
  }

  const maxPoints = Math.max(currentDay.maxPoints, 1);
  const calendarProgress = Math.max(currentDay.calendarProgress, 4);
  const laneHeight = 62;
  const leaderLaneHeight = 70;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Corrida do ranking</h2>
          <p className="mt-1 text-sm text-slate-600">
            Evolucao acumulada por dia de jogo finalizado. Mostrando o top 8.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setDayIndex(0);
            }}
            className="flex size-10 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50"
            aria-label="Voltar para o primeiro dia"
          >
            <SkipBack size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }

              if (dayIndex >= latestDayIndex) {
                setDayIndex(0);
              }

              setPlaying(true);
            }}
            className="flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            {playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
            {playing ? "Pausar" : "Rodar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setDayIndex((value) => Math.min(value + 1, latestDayIndex));
            }}
            className="flex size-10 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50"
            aria-label="Avancar um dia"
          >
            <SkipForward size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setDayIndex(latestDayIndex);
            }}
            className="h-10 rounded-md border border-emerald-700 bg-white px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
          >
            Atual
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="relative overflow-hidden bg-[#eef1e8] p-4 sm:p-6">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(4,120,87,0.10))]" />
          <div className="relative overflow-hidden rounded-md border border-slate-300 bg-[#dfe7d6] p-4 shadow-inner sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.65),transparent_42%),repeating-linear-gradient(90deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_72px)]" />
            <div
              className="pointer-events-none absolute inset-x-[-12%] bottom-[-80px] h-56 border-t border-white/70 bg-white/20"
              style={{
                transform: "perspective(760px) rotateX(62deg)",
                transformOrigin: "center top",
              }}
            />
            <div className="relative mb-5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <span>Largada</span>
              <span>{currentDay.label}</span>
              <span>Final 19 jul.</span>
            </div>

            <div
              className="relative"
              style={{
                height: rows.length > 0 ? leaderLaneHeight + Math.max(rows.length - 1, 0) * laneHeight : 0,
              }}
            >
              {rows.map((row, index) => {
                const rawProgress = (row.totalPoints / maxPoints) * 100;
                const progress = Math.min(
                  Math.max((rawProgress * calendarProgress) / 100, row.totalPoints > 0 ? 8 : 0),
                  100,
                );
                const color = getParticipantColor(row.participantId);
                const isLeader = index === 0;
                const rowTop = index === 0 ? 0 : leaderLaneHeight + (index - 1) * laneHeight;
                const labelOnLeft = progress > 58;

                return (
                  <div
                    key={row.participantId}
                    className={
                      isLeader
                        ? "absolute left-0 right-0 h-16 rounded-md border border-white/70 bg-white/30 transition-transform duration-700 ease-out"
                        : "absolute left-0 right-0 h-14 rounded-md border border-white/70 bg-white/30 transition-transform duration-700 ease-out"
                    }
                    style={{ transform: `translateY(${rowTop}px)` }}
                  >
                    <div className="absolute left-3 right-3 top-1/2 h-px bg-white/90" />
                    <div
                      className="absolute left-3 top-1/2 h-4 -translate-y-1/2 rounded-full opacity-95 transition-[width] duration-700 ease-out"
                      style={{
                        width: `calc((100% - 1.5rem) * ${progress / 100})`,
                        background: `linear-gradient(90deg, ${color}33, ${color})`,
                      }}
                    />
                    <div
                      className="absolute inset-x-3 top-1/2 h-10 -translate-y-1/2 transition-[width] duration-700 ease-out"
                      style={{
                        width: `calc((100% - 1.5rem) * ${progress / 100})`,
                        minWidth: "34px",
                      }}
                    >
                      <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2">
                        <HorseMarker
                          color={color}
                          initials={getInitials(row.participantName)}
                          large={isLeader}
                        />
                      </div>
                      <div
                        className={
                          isLeader
                            ? "absolute top-1/2 flex h-12 w-[220px] -translate-y-1/2 items-center gap-2 rounded-md border border-black/10 bg-white px-3 shadow-[0_14px_24px_rgba(15,23,42,0.20)]"
                            : "absolute top-1/2 flex h-10 w-[200px] -translate-y-1/2 items-center gap-2 rounded-md border border-black/10 bg-white px-3 shadow-[0_10px_18px_rgba(15,23,42,0.14)]"
                        }
                        style={labelOnLeft ? { right: "18px" } : { left: "calc(100% + 18px)" }}
                      >
                        <div
                          className="h-4 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={isLeader ? "truncate text-sm font-black" : "truncate text-xs font-bold"}>
                            <span className="mr-2 text-xs text-slate-500">{index + 1}.</span>
                            {row.participantName}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {row.exactScores} cravados - {row.correctOutcomes} finais
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className={isLeader ? "text-lg font-black" : "text-base font-black"}>
                            {row.totalPoints}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-5 flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span>
                Dia {dayIndex + 1} de {days.length}
              </span>
              <span>{Math.round(calendarProgress)}% do calendario</span>
              <span>{currentDay.leader?.totalPoints ?? 0} pontos do lider</span>
            </div>
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dia atual</p>
          <p className="mt-1 text-3xl font-black">{currentDay.label}</p>
          <p className="mt-4 text-sm text-slate-600">Lider</p>
          <p className="mt-1 text-xl font-bold">{currentDay.leader?.participantName ?? "-"}</p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {currentDay.leader?.totalPoints ?? 0} pontos
          </p>

          <label className="mt-6 block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Linha do tempo
            </span>
            <input
              type="range"
              min={0}
              max={days.length - 1}
              value={dayIndex}
              onChange={(event) => {
                setPlaying(false);
                setDayIndex(Number(event.target.value));
              }}
              className="mt-3 w-full accent-emerald-700"
            />
          </label>

          <div className="mt-6 space-y-2">
            {rows.slice(0, 5).map((row, index) => (
              <div
                key={row.participantId}
                className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <HorseMarker
                    color={getParticipantColor(row.participantId)}
                    initials={getInitials(row.participantName)}
                  />
                  <span className="truncate">
                    {index + 1}. {row.participantName}
                  </span>
                </span>
                <span className="text-sm font-bold">{row.totalPoints}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function HorseMarker({
  color,
  initials,
  large = false,
}: {
  color: string;
  initials: string;
  large?: boolean;
}) {
  return (
    <div
      className={
        large
          ? "relative flex size-7 shrink-0 items-center justify-center rounded-full text-white ring-2 ring-white"
          : "relative flex size-6 shrink-0 items-center justify-center rounded-full text-white ring-2 ring-white"
      }
      style={{ backgroundColor: color }}
      title={initials}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={large ? "size-5" : "size-4"}
        fill="none"
      >
        <path
          d="M8 23h13c3 0 5-2 5-5v-3c0-2-1-4-3-5l-3-2-1-4-4 3-4 1c-3 1-5 4-5 7v3c0 2 1 4 2 5Z"
          fill="currentColor"
          opacity="0.96"
        />
        <path
          d="M11 23v4M20 23v4M19 8l-3 4M23 12h3"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path d="M22 14.5h.1" stroke={color} strokeLinecap="round" strokeWidth="3" />
      </svg>
      <span className="sr-only">{initials}</span>
    </div>
  );
}

function getParticipantColor(participantId: string) {
  let hash = 0;

  for (let index = 0; index < participantId.length; index += 1) {
    hash = (hash * 31 + participantId.charCodeAt(index)) % 2147483647;
  }

  return participantColors[Math.abs(hash) % participantColors.length];
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}
