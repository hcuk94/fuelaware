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

## Data provider setup

FuelAware ships with two country integrations:

- UK via `UK_FUEL_CLIENT_ID` and `UK_FUEL_CLIENT_SECRET`
- France via `FRANCE_FUEL_API_URL`

All provider settings are environment variables, so the setup is the same whether you run the app locally, in Docker Compose, or in another container platform.

### 1. Configure the UK provider

The UK integration defaults to the UK Government Fuel Finder public prices endpoint, so in most cases you only need to supply your client credentials.

Set:

```bash
UK_FUEL_CLIENT_ID="your-client-id"
UK_FUEL_CLIENT_SECRET="your-client-secret"
```

Notes:

- `UK_FUEL_API_URL` is optional. If unset, FuelAware uses `https://www.fuel-finder.service.gov.uk/api/v1/` and reads prices from its `/prices` resource.
- The UK Government Fuel Finder API uses OAuth 2.0 client credentials. FuelAware exchanges `UK_FUEL_CLIENT_ID` and `UK_FUEL_CLIENT_SECRET` for a bearer token before calling the public API.
- `UK_FUEL_TOKEN_URL` is optional. If unset, FuelAware defaults to `https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token`.
- `UK_FUEL_API_SCOPE` is optional. If unset, FuelAware uses `fuelfinder.read`.
- FuelAware accepts both the older station-style payload (`stations`, `data`) and row-based payloads (`results`, `items`) so the UK adapter can tolerate upstream shape changes more easily.
- If the UK fetch or token exchange fails, FuelAware falls back to bundled UK sample data.

### 2. Configure the France provider

The France integration already defaults to the public French instant fuel-price dataset, so in most cases you do not need to change anything.

Default:

```bash
FRANCE_FUEL_API_URL="https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=100"
```

Notes:

- Leave `FRANCE_FUEL_API_URL` as-is to use the public French dataset.
- Override it only if you want to use a different mirror, gateway, or pre-filtered endpoint.
- If the France fetch fails, FuelAware falls back to bundled France sample data.
- The France endpoint should return JSON with either a `results` array or a `records` array.

### 3. Example `.env`

For a deployment with both providers enabled:

```bash
UK_FUEL_CLIENT_ID="your-client-id"
UK_FUEL_CLIENT_SECRET="your-client-secret"
FRANCE_FUEL_API_URL="https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=100"
```

For Docker Compose, add the same values to the `.env` file that `docker compose` reads before you start the stack.

If your deployment must reach provider APIs through an outbound proxy, FuelAware also respects standard proxy environment variables for provider fetches:

```bash
HTTP_PROXY="http://proxy.example:8080"
HTTPS_PROXY="http://proxy.example:8080"
NO_PROXY="localhost,127.0.0.1"
```

### 4. Verify the integrations after startup

1. Start FuelAware.
2. Sign in as the admin user.
3. Open the admin page.
4. Enable `Allow manual sync` and save.
5. Click `Run sync`.

If the sync succeeds, the admin UI reports a summary such as the provider name and the number of stations ingested.

If one provider is misconfigured or unavailable, FuelAware logs a warning and uses that country's bundled sample data instead. This is useful for development, but for production you should treat fallback data as a sign that the provider configuration or upstream service needs attention.

Because upstream schemas and access methods can change, providers are isolated in `src/lib/data-sources` so country integrations can evolve independently from the rest of the app.

## Local database note

Prisma client generation works normally, but if `prisma db push` fails in your local environment, use `npm run db:init` to apply the bundled SQLite schema and then run the seed script.
