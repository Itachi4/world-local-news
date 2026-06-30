# Snew

A global news aggregator covering 30+ sources across 6 continents. Articles are fetched from RSS feeds, enriched with images, and surfaced in a regional feed with AI-generated editorial illustrations and a daily email digest.

**Production:** [snewweb.org](https://snewweb.org)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix UI primitives) |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Edge runtime | Deno (Supabase Edge Functions) |

### External services

| Service | Purpose |
|---------|---------|
| [Together AI](https://together.ai) — `FLUX.1-schnell` | AI editorial image generation for articles without photos |
| [Resend](https://resend.com) | Transactional email — daily/weekly digest delivery |
| [Jina Reader](https://jina.ai/reader) | Article page scraping to extract og:image URLs |
| [wsrv.nl](https://wsrv.nl) | Image proxy — resizes and caches article thumbnails |
| [Google News RSS](https://news.google.com) | Primary RSS source for all 6 regional feeds |

---

## Repository layout

```
├── src/
│   ├── components/
│   │   ├── ArticleCard.tsx        # Article card — handles AI image generation per card
│   │   ├── SnewMark.tsx           # Brand mark SVG (compass star fallback)
│   │   ├── feed/
│   │   │   ├── LeadStory.tsx      # Lead + secondary story layout
│   │   │   ├── ArticleGrid.tsx    # Main article grid
│   │   │   ├── DigestSection.tsx  # Email subscription UI
│   │   │   ├── CategoryTabs.tsx   # Region/category tab bar
│   │   │   └── LiveWireTicker.tsx # Headline ticker
│   │   └── ui/                    # shadcn/ui component library
│   ├── lib/
│   │   ├── brandImage.ts          # isBrandingImage / isAiImage utilities
│   │   └── imageProxy.ts          # wsrv.nl proxy helper
│   ├── pages/
│   │   ├── Index.tsx              # Main feed page
│   │   └── Unsubscribe.tsx        # One-click unsubscribe page
│   └── integrations/supabase/     # Generated Supabase client + types
├── supabase/
│   ├── functions/
│   │   ├── scrape-news/           # RSS ingestion + image enrichment edge function
│   │   ├── generate-lead-image/   # Flux Schnell AI image generation
│   │   └── send-digest/           # Email digest sender (Resend)
│   └── migrations/                # PostgreSQL migration files
└── public/
```

---

## Database

Six regional article tables in Supabase PostgreSQL, one per continent:

```
articles_africa
articles_asia
articles_europe
articles_north_america
articles_oceania
articles_south_america
```

Each table shares the same schema:

```sql
id             uuid PRIMARY KEY
title          text
snippet        text
url            text UNIQUE
image_url      text
source_name    text
source_country text
source_region  text
category       text
published_at   timestamptz
created_at     timestamptz
```

Digest subscriptions are stored in `digest_subscriptions` with frequency, categories, unsubscribe token, and last-sent timestamp.

---

## Getting started

### Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/Itachi4/world-local-news.git
cd world-local-news
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 3. Apply database migrations

```bash
supabase link --project-ref <project-ref>
supabase db push --linked
```

### 4. Deploy edge functions

```bash
supabase functions deploy scrape-news --project-ref <project-ref>
supabase functions deploy generate-lead-image --project-ref <project-ref>
supabase functions deploy send-digest --project-ref <project-ref>
```

Set the required secrets:

```bash
supabase secrets set \
  TOGETHER_API_KEY=<together-ai-key> \
  RESEND_API_KEY=<resend-key> \
  JINA_API_KEY=<jina-key> \
  --project-ref <project-ref>
```

`TOGETHER_API_KEY` and `JINA_API_KEY` are optional — the app degrades gracefully (Snew brand mark shown instead of AI image; image scraping skipped).

### 5. Create Storage bucket

In the Supabase dashboard, create a **public** bucket named `lead-images`. This stores AI-generated article illustrations.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Edge functions

### `scrape-news`

Fetches articles from Google News RSS for each region, extracts and scores images via Jina Reader, deduplicates by URL, and upserts into the regional tables. Supports a `clearGoogleImages` mode to null branding image URLs.

```bash
# Trigger a scrape for Asia
curl -X POST https://<project-ref>.supabase.co/functions/v1/scrape-news \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"region":"asia"}'
```

### `generate-lead-image`

Accepts `{ articleId, table, title, snippet }`. Checks the `lead-images` Storage bucket for a cached PNG; if absent, generates one via Together AI Flux Schnell, uploads it, and persists the public URL back to the article row.

### `send-digest`

Fetches active subscribers from `digest_subscriptions`, builds an HTML + plain-text digest from recent articles, and delivers via Resend. Supports `dryRun` and `frequency` (daily/weekly) parameters.

```bash
# Dry run — no emails sent
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-digest \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"dryRun":true}'
```

Cron schedules (configured via `pg_cron`):
- Daily digest — 08:00 UTC
- Weekly digest — Monday 08:00 UTC

---

## Development scripts

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Production build
npm run preview    # Serve the production build locally
npm run lint       # ESLint
```

---

## Email digest setup

1. Create a free account at [resend.com](https://resend.com)
2. Add and verify your sending domain under **Domains**
3. Create an API key and set it as `RESEND_API_KEY` in Supabase secrets
4. Set `DIGEST_EMAIL_FROM` to your verified sender address (optional — defaults to `nsewspace@manageyourwork.com`)

---

## Contributing

1. Fork the repo and create a branch from `main`
2. Make your changes — keep files under 500 lines, validate at system boundaries
3. Open a pull request against `main`

The `test` branch is used for staging. Changes merged to `main` deploy to production.

---

## License

MIT
