// Read-only Supabase coverage audit: counts articles per region x country x category
// for snewweb.org, replicating the exact filter logic from src/pages/Index.tsx's
// fetchArticles/buildCategoryOrFilter (image_url not null, published_at within 7 days,
// category keyword OR-filter on title/snippet, source_country eq for country-level).
//
// Runs locally (via a Windows Task Scheduler job — see scripts/README.md) because the
// Claude Code cloud routine equivalent is blocked by an org-level network egress policy
// that has nothing to do with per-environment settings (confirmed 2026-09-04–09-08: every
// attempt, including a purpose-built "full access" environment, failed identically with
// "connect_rejected (organization policy)" from the sandbox's own egress proxy).
//
// Origin: 2026-09-03 audit found 53% of 400 country x category combos had 0 articles
// (general had 0% zero — scraper itself was healthy). Root cause: daily scrape crons never
// passed a category param. Fix: supabase/migrations/20260903140000_category_specific_scrape_crons.sql
// added 42 category-specific crons. This script tracks whether that fix is actually working.
//
// NOTE: SUPABASE_URL/ANON_KEY, COUNTRIES_BY_REGION, and CATEGORY_KEYWORDS below are mirrored
// from src/integrations/supabase/client.ts, src/lib/countryMap.ts, and src/pages/Index.tsx.
// Keep in sync if those change — this script does not import them at runtime.

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const LOG_DIR = join(REPO_ROOT, 'logs', 'coverage-audit');
mkdirSync(LOG_DIR, { recursive: true });

// Safety net for the unattended (Task Scheduler) case: an uncaught error would
// otherwise just vanish with no trace since nothing is watching this process interactively.
const errorLogPath = join(LOG_DIR, '_errors.log');
const logFatal = (label, err) => {
  try { writeFileSync(errorLogPath, `[${new Date().toISOString()}] ${label}: ${(err && err.stack) || err}\n`, { flag: 'a' }); } catch {}
};
process.on('uncaughtException', (err) => logFatal('uncaughtException', err));
process.on('unhandledRejection', (err) => logFatal('unhandledRejection', err));

const SUPABASE_URL = 'https://zrofxxvmsaaoaztorpyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyb2Z4eHZtc2Fhb2F6dG9ycHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDI3NDksImV4cCI6MjA3NjA3ODc0OX0.S7E4HytCd17Kzqjnf4hcxbmZxRcDTAWKM8dnFHmRWVU';

const REGION_TABLES = {
  Africa: 'articles_africa',
  Asia: 'articles_asia',
  Europe: 'articles_europe',
  'North America': 'articles_north_america',
  Oceania: 'articles_oceania',
  'South America': 'articles_south_america',
};

const COUNTRIES_BY_REGION = {
  Africa: ['ZA', 'NG', 'EG', 'KE', 'GH', 'MA', 'ET', 'TZ'],
  Asia: ['IN', 'CN', 'JP', 'SG', 'SA', 'KR', 'PK', 'NP', 'IR', 'SY', 'BD', 'IL', 'LK', 'AF', 'QA', 'JO', 'OM', 'YE', 'AE'],
  Europe: ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'PL'],
  'North America': ['US', 'CA', 'MX'],
  Oceania: ['AU', 'NZ', 'FJ', 'PG'],
  'South America': ['BR', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY'],
};

const CATEGORIES = [
  'general', 'tech-ai', 'business-finance', 'politics',
  'arts-entertainment-fashion', 'sports-games', 'travel-leisure', 'religion-spirituality',
];

const CATEGORY_KEYWORDS = {
  'tech-ai': ['technology', 'software', 'startup', 'innovation', 'digital', 'cyber', 'semiconductor', 'chip', 'robot', 'drone', 'satellite', 'broadband', '5G'],
  'business-finance': ['economy', 'inflation', 'GDP', 'stock', 'market', 'investment', 'trade', 'finance', 'revenue', 'profit', 'bank', 'IMF', 'budget', 'tariff', 'export'],
  politics: ['president', 'parliament', 'minister', 'election', 'government', 'senate', 'congress', 'legislation', 'diplomat', 'summit', 'treaty', 'sanction', 'vote'],
  'arts-entertainment-fashion': ['music', 'movie', 'film', 'festival', 'fashion', 'celebrity', 'concert', 'exhibition', 'theatre', 'culture', 'award', 'album', 'entertainment'],
  'sports-games': ['football', 'cricket', 'basketball', 'tennis', 'soccer', 'Olympics', 'championship', 'tournament', 'athlete', 'match', 'league', 'stadium', 'sport'],
  'travel-leisure': ['travel', 'tourism', 'tourist', 'vacation', 'hotel', 'airline', 'flight', 'destination', 'resort', 'visa', 'passport', 'heritage', 'leisure'],
  'religion-spirituality': ['religion', 'faith', 'church', 'mosque', 'temple', 'prayer', 'spiritual', 'holy', 'pilgrimage', 'bishop', 'imam', 'pope', 'ramadan', 'easter', 'diwali'],
};

// 2026-09-03 baseline, before the 42 category-specific crons landed.
const BASELINE = {
  date: '2026-09-03',
  countryCategoryCombos: 400,
  zeroPct: 53,
  lowPct: 24, // 1-2 articles
  generalZeroPct: 0,
};

function buildOrFilter(category) {
  const kws = CATEGORY_KEYWORDS[category];
  if (!kws) return null;
  return kws.flatMap((kw) => [`title.ilike.*${kw}*`, `snippet.ilike.*${kw}*`]).join(',');
}

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

async function getCount(table, category, country) {
  const params = new URLSearchParams();
  params.set('select', 'id');
  params.set('image_url', 'not.is.null');
  params.set('published_at', `gte.${sevenDaysAgo}`);
  if (country) params.set('source_country', `eq.${country}`);
  const orFilter = buildOrFilter(category);
  if (orFilter) params.set('or', `(${orFilter})`);

  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: `${res.status}: ${text.slice(0, 200)}` };
  }
  const contentRange = res.headers.get('content-range');
  const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : null;
  return { count: total };
}

async function runBatched(tasks, concurrency = 12) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const jobMeta = [];
  const jobs = [];

  for (const [region, table] of Object.entries(REGION_TABLES)) {
    for (const category of CATEGORIES) {
      jobMeta.push({ scope: 'region', region, country: null, category });
      jobs.push(() => getCount(table, category, null));
    }
  }
  for (const [region, table] of Object.entries(REGION_TABLES)) {
    for (const country of COUNTRIES_BY_REGION[region]) {
      for (const category of CATEGORIES) {
        jobMeta.push({ scope: 'country', region, country, category });
        jobs.push(() => getCount(table, category, country));
      }
    }
  }

  const results = await runBatched(jobs, 12);
  const rows = jobMeta.map((meta, idx) => ({ ...meta, ...results[idx] }));

  const errors = rows.filter((r) => r.error);
  const countryRows = rows.filter((r) => r.scope === 'country');
  const regionRows = rows.filter((r) => r.scope === 'region');
  const zeroCountry = countryRows.filter((r) => r.count === 0);
  const lowCountry = countryRows.filter((r) => r.count > 0 && r.count <= 2);
  const generalCountry = countryRows.filter((r) => r.category === 'general');
  const generalZero = generalCountry.filter((r) => r.count === 0);

  const zeroPct = countryRows.length ? Math.round((100 * zeroCountry.length) / countryRows.length) : null;
  const lowPct = countryRows.length ? Math.round((100 * lowCountry.length) / countryRows.length) : null;
  const generalZeroPct = generalCountry.length ? Math.round((100 * generalZero.length) / generalCountry.length) : null;

  // Region x category combos that are 0 AND have a dedicated cron job (all non-general categories do).
  const flagged = regionRows.filter((r) => r.category !== 'general' && r.count === 0);

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');

  const jsonPath = join(LOG_DIR, `${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify({ ranAt: now.toISOString(), rows, errors }, null, 2));

  const lines = [];
  lines.push(`Coverage audit — ${now.toISOString()}`);
  lines.push('='.repeat(60));
  if (errors.length > 0) {
    lines.push(`ERRORS: ${errors.length}/${rows.length} queries failed.`);
    lines.push(`Sample error: ${errors[0].error}`);
    lines.push('');
  }
  lines.push(`Baseline (${BASELINE.date}): ${BASELINE.zeroPct}% zero, ${BASELINE.lowPct}% low (1-2), general ${BASELINE.generalZeroPct}% zero`);
  lines.push(`Current:                    ${zeroPct}% zero, ${lowPct}% low (1-2), general ${generalZeroPct}% zero`);
  lines.push('');
  if (zeroPct !== null) {
    const delta = BASELINE.zeroPct - zeroPct;
    lines.push(delta > 0
      ? `Zero-result rate improved by ${delta} points since baseline.`
      : delta < 0
      ? `Zero-result rate got WORSE by ${-delta} points since baseline — investigate.`
      : `Zero-result rate unchanged since baseline.`);
  }
  lines.push('');
  lines.push('Region x category combos still at 0 (each has a dedicated cron — worth flagging):');
  if (flagged.length === 0) {
    lines.push('  (none)');
  } else {
    for (const f of flagged) lines.push(`  ${f.region} / ${f.category}: 0`);
  }
  lines.push('');
  lines.push(`Full results: ${jsonPath}`);

  const summary = lines.join('\n');
  const txtPath = join(LOG_DIR, `${stamp}.txt`);
  writeFileSync(txtPath, summary);

  console.log(summary);
}

main().catch((err) => {
  logFatal('main() rejected', err);
  console.error('Audit script failed:', err);
  process.exit(1);
});
