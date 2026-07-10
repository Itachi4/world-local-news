import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Email via Resend HTTP API — no SMTP, works in Deno edge functions

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REGION_TABLES = [
  'articles_africa',
  'articles_asia',
  'articles_europe',
  'articles_north_america',
  'articles_oceania',
  'articles_south_america',
];

const CATEGORY_LABELS: Record<string, string> = {
  'general':                     'General',
  'tech-ai':                     'Tech & AI',
  'business-finance':            'Business & Finance',
  'politics':                    'Politics',
  'arts-entertainment-fashion':  'Arts, Entertainment & Fashion',
  'sports-games':                'Sports & Games',
  'travel-leisure':              'Travel & Leisure',
  'religion-spirituality':       'Religion & Spirituality',
};

function getCategoryLabel(value: string): string {
  return CATEGORY_LABELS[value] || value;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// Article fetching
// ---------------------------------------------------------------------------

async function fetchArticlesForDigest(
  supabase: any,
  categories: string[],
  hoursBack: number,
  maxPerCategory = 6,
): Promise<any[]> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  const includeGeneral = categories.includes('general');
  const allArticles: any[] = [];

  for (const tableName of REGION_TABLES) {
    let query = (supabase.from(tableName) as any)
      .select('id, title, url, source_name, source_country, source_region, published_at, category, snippet, image_url')
      .gte('published_at', cutoff)
      .order('published_at', { ascending: false })
      .limit(60);

    // If the subscriber only wants specific categories, filter on them.
    if (!includeGeneral) {
      query = query.in('category', categories);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`⚠️  fetchArticlesForDigest: error from ${tableName}:`, error.message);
      continue;
    }
    if (data) allArticles.push(...data);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Sort newest first
  unique.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  if (includeGeneral) {
    // General = show all categories, return top articles overall
    return unique.slice(0, maxPerCategory * 5);
  }

  // Multiple specific categories — cap per category so no single topic dominates
  const byCat: Record<string, any[]> = {};
  for (const article of unique) {
    const cat = article.category || 'general';
    if (!byCat[cat]) byCat[cat] = [];
    if (byCat[cat].length < maxPerCategory) {
      byCat[cat].push(article);
    }
  }
  return Object.values(byCat).flat();
}

// ---------------------------------------------------------------------------
// HTML email builder
// ---------------------------------------------------------------------------

function buildEmailHtml(subscriber: any, articles: any[]): string {
  const categories: string[] = subscriber.categories || ['general'];
  const frequency: string = subscriber.frequency || 'daily';
  const unsubscribeUrl = `https://snewweb.org/unsubscribe?token=${subscriber.unsubscribe_token}`;
  const siteUrl = 'https://snewweb.org';

  // Group articles by category for display
  const grouped: Record<string, any[]> = {};
  for (const article of articles) {
    const cat = article.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(article);
  }

  const regionColors: Record<string, string> = {
    'Africa':        '#ef4444',
    'Asia':          '#f59e0b',
    'Europe':        '#10b981',
    'North America': '#3b82f6',
    'South America': '#14b8a6',
    'Oceania':       '#06b6d4',
  };

  function regionBadge(region: string): string {
    const color = regionColors[region] || '#6b7280';
    return `<span style="display:inline-block;background:${color}20;color:${color};font-size:10px;font-weight:700;letter-spacing:0.4px;padding:2px 7px;border-radius:99px;text-transform:uppercase;">${escapeHtml(region)}</span>`;
  }

  const articleRows = articles.map(a => {
    const date = new Date(a.published_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
    const snippet = a.snippet
      ? escapeHtml(a.snippet.slice(0, 160)) + (a.snippet.length > 160 ? '…' : '')
      : '';
    return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #f0f0f5;">
          ${a.image_url ? `
          <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">
            <img src="${escapeHtml(a.image_url)}" alt="" width="100%" style="display:block;border-radius:8px;max-height:180px;object-fit:cover;margin-bottom:10px;" />
          </a>` : ''}
          <div style="margin-bottom:5px;">
            ${regionBadge(a.source_region || '')}
            <span style="font-size:11px;color:#9ca3af;margin-left:6px;">${escapeHtml(a.source_name)} · ${date}</span>
          </div>
          <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer"
             style="color:#1e3a8a;text-decoration:none;font-size:15px;font-weight:700;line-height:1.45;display:block;">
            ${escapeHtml(a.title)}
          </a>
          ${snippet ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.55;">${snippet}</p>` : ''}
        </td>
      </tr>`;
  }).join('');

  const categoryPills = categories.map(c =>
    `<span style="display:inline-block;background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;margin:2px 3px 2px 0;">${escapeHtml(getCategoryLabel(c))}</span>`
  ).join('');

  const emptyState = `
    <tr><td style="padding:40px 0;text-align:center;">
      <p style="color:#9ca3af;font-size:15px;margin:0 0 8px;">No new articles in this period.</p>
      <p style="margin:0;"><a href="${siteUrl}" style="color:#1a56db;font-size:13px;">Browse live headlines →</a></p>
    </td></tr>`;

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Your snewweb ${frequency} digest</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- ── Header ── -->
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a8a 0%,#4c1d95 100%);padding:32px 36px 28px;">
      <div style="color:#fff;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px;">snewweb</div>
      <div style="color:#a5b4fc;font-size:13px;margin-bottom:18px;">Global news, delivered to you</div>
      <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;display:inline-block;">
        <span style="color:#e0e7ff;font-size:12px;font-weight:500;">Your ${escapeHtml(frequency)} digest &nbsp;·&nbsp; ${now}</span>
      </div>
    </td>
  </tr>

  <!-- ── Category pills ── -->
  <tr>
    <td style="background:#f8fafc;padding:12px 36px;border-bottom:1px solid #e5e7eb;">
      <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-right:8px;">Topics</span>
      ${categoryPills}
    </td>
  </tr>

  <!-- ── Articles ── -->
  <tr>
    <td style="padding:8px 36px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${articles.length > 0 ? articleRows : emptyState}
      </table>
    </td>
  </tr>

  <!-- ── CTA ── -->
  <tr>
    <td style="padding:0 36px 32px;text-align:center;">
      <a href="${siteUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#1a56db,#7e3af2);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;letter-spacing:0.2px;">
        Browse all headlines →
      </a>
    </td>
  </tr>

  <!-- ── Footer ── -->
  <tr>
    <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.7;">
        You're receiving this because you subscribed to snewweb news alerts.<br/>
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${siteUrl}" style="color:#6b7280;text-decoration:underline;">snewweb.org</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildEmailText(subscriber: any, articles: any[]): string {
  const frequency: string = subscriber.frequency || 'daily';
  const unsubscribeUrl = `https://snewweb.org/unsubscribe?token=${subscriber.unsubscribe_token}`;
  const lines = [
    `snewweb — Your ${frequency} global news digest`,
    new Date().toDateString(),
    '',
    `${articles.length} article${articles.length !== 1 ? 's' : ''} for you:`,
    '',
    ...articles.map((a, i) =>
      `${i + 1}. ${a.title}\n   ${a.source_name} · ${a.source_region}\n   ${a.url}\n`
    ),
    '──────────────────────────',
    `Unsubscribe: ${unsubscribeUrl}`,
    'snewweb.org',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey  = Deno.env.get('RESEND_API_KEY');
    const emailFrom  = Deno.env.get('DIGEST_EMAIL_FROM') || 'digest@snewweb.org';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }

    const frequency: 'daily' | 'weekly' | null = body?.frequency ?? null;
    const dryRun: boolean = body?.dryRun === true;

    console.log(`📧 send-digest invoked | frequency=${frequency ?? 'all'} | dryRun=${dryRun}`);

    // Fetch active subscribers
    let subQuery = (supabase.from('digest_subscriptions') as any)
      .select('*')
      .eq('is_active', true);
    if (frequency) {
      subQuery = subQuery.eq('frequency', frequency);
    }
    const { data: subscribers, error: subError } = await subQuery;

    if (subError) throw subError;
    if (!subscribers?.length) {
      console.log('ℹ️  No active subscribers found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active subscribers', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👥 ${subscribers.length} active subscriber(s)`);

    const results = { sent: 0, failed: 0, skipped: 0 };

    for (const subscriber of subscribers) {
      try {
        const hoursBack  = subscriber.frequency === 'weekly' ? 168 : 24;
        const categories: string[] = subscriber.categories?.length ? subscriber.categories : ['general'];

        const articles = await fetchArticlesForDigest(supabase, categories, hoursBack, 6);

        if (articles.length === 0) {
          console.log(`⚠️  No articles for ${subscriber.email} — skipping`);
          results.skipped++;
          continue;
        }

        const subject = subscriber.frequency === 'weekly'
          ? `Your weekly global news digest — snewweb`
          : `Your daily global news digest — snewweb`;

        const html = buildEmailHtml(subscriber, articles);
        const text = buildEmailText(subscriber, articles);

        if (dryRun) {
          console.log(`[dry-run] → ${subscriber.email}: ${articles.length} articles, subject: "${subject}"`);
          results.sent++;
          continue;
        }

        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `snewweb <${emailFrom}>`,
            to: [subscriber.email],
            subject,
            html,
            text,
          }),
        });
        if (!sendRes.ok) {
          const errText = await sendRes.text();
          throw new Error(`Resend ${sendRes.status}: ${errText}`);
        }

        // Record delivery timestamp
        await (supabase.from('digest_subscriptions') as any)
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', subscriber.id);

        console.log(`✅ Sent to ${subscriber.email} (${articles.length} articles)`);
        results.sent++;

      } catch (err: any) {
        console.error(`❌ Failed for ${subscriber.email}:`, err?.message || err);
        results.failed++;
      }
    }

    console.log(`📊 Done: sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`);
    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Fatal error in send-digest:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
