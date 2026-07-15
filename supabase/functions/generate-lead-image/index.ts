import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'lead-images';
const TOGETHER_API = 'https://api.together.xyz/v1/images/generations';
// FLUX.1-schnell on Together — sub-second generation, editorial style
const MODEL = 'black-forest-labs/FLUX.1-schnell';

function buildPrompt(title: string, snippet: string): string {
  const subject = title.replace(/["""'']/g, '').slice(0, 120);
  const context = snippet ? snippet.replace(/["""'']/g, '').slice(0, 80) : '';
  return (
    `Editorial news illustration, muted newsroom palette, conceptual and abstract, ` +
    `no text, no real faces, no logos, no branding. Topic: "${subject}". ` +
    (context ? `Context: "${context}". ` : '') +
    `Style: flat editorial graphic, limited palette, clean composition.`
  );
}

async function fetchWithRetry(url: string, opts: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status !== 429 && res.status !== 503) return res;
    if (attempt < retries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
  return fetch(url, opts);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const togetherKey = Deno.env.get('TOGETHER_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Supabase credentials' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let requestBody: any = {};
    try { requestBody = await req.json(); } catch { /* no body */ }

    const { articleId, table, title, snippet } = requestBody || {};

    if (!articleId || !table || !title) {
      return new Response(JSON.stringify({ success: false, error: 'articleId, table, and title are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const filename = `${articleId}.png`;

    // ── 1. Cache check ────────────────────────────────────────────────────────
    const { data: existingFile } = await supabase.storage.from(BUCKET).list('', {
      search: filename,
    });
    if (existingFile && existingFile.some((f: any) => f.name === filename)) {
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      console.log(`✅ Cache hit for ${articleId}: ${publicUrl}`);
      return new Response(JSON.stringify({ success: true, url: publicUrl, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Key check ──────────────────────────────────────────────────────────
    if (!togetherKey) {
      console.log('ℹ️ TOGETHER_API_KEY not set — returning null (frontend will show brand mark)');
      return new Response(JSON.stringify({ success: true, url: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Generate via Flux Schnell ──────────────────────────────────────────
    const prompt = buildPrompt(title, snippet || '');
    console.log(`🎨 Generating image for "${title.slice(0, 60)}…"`);

    const genRes = await fetchWithRetry(TOGETHER_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${togetherKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        width: 1024,
        height: 576,
        steps: 4,
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      console.error(`❌ Together API error ${genRes.status}:`, errText);
      return new Response(JSON.stringify({ success: false, url: null, error: `Together API ${genRes.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const genJson = await genRes.json();
    const b64 = genJson?.data?.[0]?.b64_json;
    if (!b64) {
      console.error('❌ No b64_json in Together response:', JSON.stringify(genJson).slice(0, 200));
      return new Response(JSON.stringify({ success: false, url: null, error: 'No image data returned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // ── 4. Upload to Storage ──────────────────────────────────────────────────
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, bytes, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError.message);
      return new Response(JSON.stringify({ success: false, url: null, error: uploadError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    console.log(`✅ Generated and stored: ${publicUrl}`);

    // ── 5. Persist URL into the article row ───────────────────────────────────
    const { error: updateError } = await (supabase.from(table as any) as any)
      .update({ image_url: publicUrl })
      .eq('id', articleId);
    if (updateError) console.warn(`⚠️ Could not update article row: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, url: publicUrl, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('❌ generate-lead-image error:', err);
    return new Response(JSON.stringify({ success: false, url: null, error: err?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
