import { createClient } from '@supabase/supabase-js';
import type { Context, Config } from '@netlify/functions';

function stripHtmlToText(html: string, maxChars = 80000): string {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  return text.slice(0, maxChars);
}

async function extractWithClaude(text: string, hint?: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const prompt = `Eres un experto en extraccion de datos B2B. Analiza el siguiente texto y extrae TODOS los prospectos/empresas/contactos que encuentres.

${hint ? `CONTEXTO DEL USUARIO: ${hint}\n` : ''}
TEXTO A ANALIZAR:
${text}

Extrae: companyName (obligatorio), contactName (obligatorio, si no hay usa "N/A"), contactTitle, email, phone, linkedinUrl, website, industry, companySize, country, city, notes

Responde UNICAMENTE con un JSON array. Si no encuentras prospectos, responde con [].`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5-20250929', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  });

  if (!response.ok) throw new Error(`Anthropic API error ${response.status}`);
  const result = await response.json();
  const content = result.content?.[0]?.text || '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed.filter((p: any) => p.companyName) : [];
  } catch { return []; }
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const isServiceCall = serviceRoleKey && token === serviceRoleKey;

  if (!isServiceCall) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await client.auth.getUser(token);
    if (authErr || !user) return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { query, industry, country, maxResults = 5 } = body;
  if (!query || typeof query !== 'string') return Response.json({ error: 'query is required' }, { status: 400 });

  let searchQuery = query;
  if (industry) searchQuery += ` ${industry}`;
  if (country) searchQuery += ` ${country}`;

  const googleKey = process.env.GOOGLE_SEARCH_API_KEY || '';
  const cseId = process.env.GOOGLE_CSE_ID || '';
  if (!googleKey || !cseId) return Response.json({ error: 'Google Search API not configured (GOOGLE_SEARCH_API_KEY, GOOGLE_CSE_ID)' }, { status: 400 });

  try {
    const gUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(cseId)}&q=${encodeURIComponent(searchQuery)}&num=10`;
    const gRes = await fetch(gUrl);
    if (!gRes.ok) return Response.json({ error: 'Google Search failed' }, { status: 502 });
    const gData = await gRes.json();
    const searchResults = (gData.items || []).slice(0, Math.min(maxResults, 10));

    if (searchResults.length === 0) {
      return Response.json({ prospects: [], meta: { query: searchQuery, pagesScraped: 0, prospectsFound: 0 } });
    }

    const pageTexts: string[] = [];
    for (const result of searchResults.slice(0, 5)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const pageRes = await fetch(result.link, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProspectorBot/1.0)' },
        });
        clearTimeout(timeout);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const text = stripHtmlToText(html, 15000);
          if (text.length > 50) pageTexts.push(`--- SOURCE: ${result.title} (${result.link}) ---\n${text}`);
        }
      } catch {
        if (result.snippet) pageTexts.push(`--- SOURCE: ${result.title} (${result.link}) ---\n${result.snippet}`);
      }
    }

    const combinedText = (pageTexts.length > 0 ? pageTexts.join('\n\n') : searchResults.map((r: any) => `${r.title}: ${r.snippet}`).join('\n')).slice(0, 80000);
    const prospects = await extractWithClaude(combinedText, `Search query: ${searchQuery}`);

    return Response.json({ prospects, meta: { query: searchQuery, pagesScraped: pageTexts.length, prospectsFound: prospects.length } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/prospector/search-web',
};
