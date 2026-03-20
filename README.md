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

1. Copy `.env.example` to `.env`.
2. Set the auth variables:

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

`NEXTAUTH_URL` must be the full public base URL where users access FuelAware.

- Local development: `http://localhost:3000`
- Production behind your own domain: for example `https://fuelaware.example.com`

`NEXTAUTH_SECRET` must be a long random string shared by all app instances for the same deployment. It is used to sign auth-related tokens and sessions. Generate it once and keep it stable; do not rotate it casually unless you are prepared for existing sessions and email links to stop working.

If you do not have `openssl`, you can generate a suitable value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

3. Install dependencies:

```bash
npm install
```

4. Prepare the database:

```bash
npm run db:generate
npm run db:init
npm run db:seed
```

5. Start the app:

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
- `.github/workflows/unstable-ghcr.yml` publishes an `unstable` image on every push to `main`.
- `.github/dependabot.yml` keeps npm dependencies, GitHub Actions, and the Docker base image up to date.

Published images are tagged to:

- `ghcr.io/<owner>/<repo>:<tag>`
- `ghcr.io/<owner>/<repo>:latest`
- `ghcr.io/<owner>/<repo>:git-<sha>`
- `ghcr.io/<owner>/<repo>:unstable`
- `ghcr.io/<owner>/<repo>:unstable-<sha>`

## Docker Compose

The included [`docker-compose.yml`](/Users/henry/proj/fuelaware/docker-compose.yml) runs the published GHCR image with a persistent SQLite volume.

Before starting it, set:

- `FUELAWARE_IMAGE` to your published image, for example `ghcr.io/acme/fuelaware:latest` or `ghcr.io/acme/fuelaware:unstable`
- `NEXTAUTH_URL` to the exact external URL users will use to open the site, for example `https://fuelaware.example.com`
- `NEXTAUTH_SECRET` to one stable random secret for that deployment, for example the output of `openssl rand -base64 32`
- SMTP settings if you want real email delivery

Example production `.env` values for Docker Compose:

```bash
FUELAWARE_IMAGE="ghcr.io/acme/fuelaware:latest"
NEXTAUTH_URL="https://fuelaware.example.com"
NEXTAUTH_SECRET="replace-this-with-a-generated-random-secret"
ADMIN_EMAIL="admin@example.com"
EMAIL_FROM="FuelAware <no-reply@fuelaware.example.com>"
```

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
