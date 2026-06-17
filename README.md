# Bolao Copa Dashboard

MVP inicial para controle de bolao da Copa do Mundo com Next.js, TypeScript,
Tailwind CSS e Supabase.

Esta etapa entrega a fundacao:

- login via Supabase Auth;
- roles `ADMIN` e `PARTICIPANT`;
- protecao de rotas no app;
- migrations com tabelas, indices, RLS e bucket de uploads;
- seed configuravel de dois ADMINs;
- seed das selecoes e das 72 partidas da fase de grupos.

## Setup Local

1. Instale dependencias:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

3. Preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SEED_ADMIN_EMAILS=admin1@example.com,admin2@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

4. Rode as migrations no Supabase.

Com Supabase CLI:

```bash
supabase db push
```

Ou aplique os arquivos de `supabase/migrations` no SQL editor do projeto.

5. Rode o seed:

```bash
npm run seed
```

6. Suba o app:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Seed Das Partidas

O script `scripts/seed.ts` carrega somente os jogos com `stage = group-stage`
do arquivo configurado em `WORLD_CUP_FIXTURES_URL`.

Fonte padrao:

```txt
https://www.thestatsapi.com/world-cup/data/fixtures.json
```

A programacao tambem deve ser conferida contra a pagina oficial da FIFA antes
do uso definitivo em producao:

```txt
https://www.fifa.com/en/articles/match-schedule-fixtures-results-teams-stadiums
```

O seed espera exatamente 72 partidas de fase de grupos e falha se a fonte
retornar uma quantidade diferente.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm run seed
```
