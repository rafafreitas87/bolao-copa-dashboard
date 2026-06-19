"use client";

import type { FormEvent } from "react";
import { SubmitButton } from "../submit-button";
import { resetAllPredictions } from "./actions";

export function ResetPredictionsForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      "Tem certeza que deseja apagar todos os palpites salvos? Participantes, uploads e resultados oficiais serao mantidos.",
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={resetAllPredictions} onSubmit={handleSubmit}>
      <SubmitButton
        pendingText="Resetando..."
        className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
      >
        Resetar todos
      </SubmitButton>
    </form>
  );
}
