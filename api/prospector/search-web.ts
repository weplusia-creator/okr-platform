import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const token = authHeader.replace('Bearer ', '');
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authErr } = await client.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { query, industry, country, maxResults = 5 } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query is required' });

  let searchQuery = query;
  if (industry) searchQuery += ` ${industry}`;
  if (country) searchQuery += ` ${country}`;

  const googleKey = process.env.GOOGLE_SEARCH_API_KEY || '';
  const cseId = process.env.GOOGLE_CSE_ID || '';
  if (!googleKey || !cseId) return res.status(400).json({ error: 'Google Search API not configured (GOOGLE_SEARCH_API_KEY, GOOGLE_CSE_ID)' });

  try {
    const gUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(cseId)}&q=${encodeURIComponent(searchQuery)}&num=10`;
    const gRes = await fetch(gUrl);
    if (!gRes.ok) return res.status(502).json({ error: 'Google Search failed' });
    const gData = await gRes.json();
    const searchResults = (gData.items || []).slice(0, Math.min(maxResults, 10));

    if (searchResults.length === 0) {
      return res.status(200).json({ prospects: [], meta: { query: searchQuery, pagesScraped: 0, prospectsFound: 0 } });
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

    return res.status(200).json({ prospects, meta: { query: searchQuery, pagesScraped: pageTexts.length, prospectsFound: prospects.length } });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
