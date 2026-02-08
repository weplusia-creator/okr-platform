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

Extrae la mayor cantidad de prospectos posible. Para cada uno, intenta obtener:
- companyName (obligatorio), contactName (obligatorio, si no hay usa "N/A"), contactTitle, email, phone, linkedinUrl, website, industry, companySize (1-9, 10-49, 50-99, 100-499, 500-999, 1000+), country, city, notes

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

  // Auth
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

  const { url, extractionHint } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL format' }); }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProspectorBot/1.0)', 'Accept': 'text/html,*/*;q=0.8' },
    });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).json({ error: `Failed to fetch URL: HTTP ${response.status}` });

    const html = await response.text();
    const text = stripHtmlToText(html);
    if (text.length < 50) return res.status(422).json({ error: 'Page has too little text content' });

    const prospects = await extractWithClaude(text, extractionHint);
    return res.status(200).json({ prospects, meta: { url, textLength: text.length, prospectsFound: prospects.length } });
  } catch (e: any) {
    if (e.name === 'AbortError') return res.status(504).json({ error: 'URL fetch timed out' });
    return res.status(500).json({ error: e.message });
  }
}
