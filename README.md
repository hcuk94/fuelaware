# FuelAware

FuelAware is an open source web app for tracking fuel prices across multiple countries and energy types. The first version supports UK and France fuel data through a modular provider layer that normalizes:

- station metadata
- multiple fuel products per site
- country-specific currencies
- arbitrary units such as `L`, `gallon`, or `kWh`

## Features

- email magic-link authentication with optional self-registration
- admin-configurable registration and sync controls
- station search by text or by proximity to browser coordinates
- favourite stations with price history charts
- alert rules for threshold drops or period lows
- provider abstraction for future petrol, diesel, hydrogen, or EV charger data

## Stack

- Next.js App Router
- TypeScript
- Prisma with SQLite
- NextAuth email magic links
- Recharts for historical charts

## Quick start

1. Copy `.env.example` to `.env` and set `NEXTAUTH_SECRET`.
2. Install dependencies:

```bash
npm install
```

3. Prepare the database:

```bash
npm run db:generate
npm run db:init
npm run db:seed
```

4. Start the app:

```bash
npm run dev
```

## Testing

Run the automated test suite and coverage report:

```bash
npm test
```

Run type-checking separately:

```bash
npm run typecheck
```

## CI and releases

- `.github/workflows/ci.yml` runs type-checks, tests, Prisma client generation, and a production build on pushes and pull requests.
- `.github/workflows/release-ghcr.yml` publishes tagged releases matching `v*` to GitHub Container Registry.

Published images are tagged to:

- `ghcr.io/<owner>/<repo>:<tag>`
- `ghcr.io/<owner>/<repo>:latest`

## Docker Compose

The included [`docker-compose.yml`](/Users/henry/proj/fuelaware/docker-compose.yml) runs the published GHCR image with a persistent SQLite volume.

Before starting it, set:

- `FUELAWARE_IMAGE` to your published image, for example `ghcr.io/acme/fuelaware:v0.1.0`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- SMTP settings if you want real email delivery

Then run:

```bash
docker compose up -d
```

## Notes on data sources

- UK: the provider is designed for the current UK government Fuel Finder / legacy open-data inputs, with a mock fallback for local development.
- France: the provider targets the official French instant fuel-price dataset and also falls back to bundled sample data during development.

Because upstream schemas and access methods can change, providers are isolated in `src/lib/data-sources` so country integrations can evolve independently from the rest of the app.

## Local database note

Prisma client generation works normally, but if `prisma db push` fails in your local environment, use `npm run db:init` to apply the bundled SQLite schema and then run the seed script.
