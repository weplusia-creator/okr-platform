import { createClient } from '@supabase/supabase-js';
import type { Context, Config } from '@netlify/functions';

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
  const { url, searchQuery, rawText } = body;
  if (!url && !searchQuery && !rawText) return Response.json({ error: 'Provide url, searchQuery, or rawText' }, { status: 400 });

  try {
    if (rawText && typeof rawText === 'string') {
      const prospects = await extractWithClaude(rawText, 'This is raw text copied from LinkedIn profile(s). Extract all contact/company data.');
      return Response.json({ prospects, meta: { method: 'raw_text', prospectsFound: prospects.length } });
    }

    if (url && typeof url === 'string') {
      const proxycurlKey = process.env.PROXYCURL_API_KEY || '';
      if (proxycurlKey) {
        try {
          const apiUrl = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(url)}`;
          const proxyRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${proxycurlKey}` } });
          if (proxyRes.ok) {
            const profile = await proxyRes.json();
            const prospect = {
              companyName: profile.experiences?.[0]?.company || profile.company || 'Unknown',
              contactName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
              contactTitle: profile.headline || null,
              email: profile.personal_emails?.[0] || null,
              phone: profile.personal_numbers?.[0] || null,
              linkedinUrl: url,
              website: null, industry: profile.industry || null, companySize: null,
              country: profile.country_full_name || null, city: profile.city || null,
              notes: profile.summary || null,
            };
            return Response.json({ prospects: [prospect], meta: { method: 'proxycurl', prospectsFound: 1 } });
          }
        } catch { /* fall through */ }
      }
      return Response.json({ error: 'Could not extract data from this LinkedIn URL. Try pasting the profile text directly.' }, { status: 422 });
    }

    if (searchQuery && typeof searchQuery === 'string') {
      const googleKey = process.env.GOOGLE_SEARCH_API_KEY || '';
      const cseId = process.env.GOOGLE_CSE_ID || '';
      if (!googleKey || !cseId) return Response.json({ error: 'Google Search API not configured' }, { status: 400 });

      const query = `site:linkedin.com/in/ ${searchQuery}`;
      const gUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(cseId)}&q=${encodeURIComponent(query)}&num=10`;
      const gRes = await fetch(gUrl);
      if (!gRes.ok) return Response.json({ error: 'Google Search failed' }, { status: 502 });
      const gData = await gRes.json();
      const items = gData.items || [];
      if (items.length === 0) return Response.json({ prospects: [], meta: { method: 'linkedin_search', prospectsFound: 0 } });

      const snippetText = items.map((r: any) => `Profile: ${r.title}\n${r.snippet}\nURL: ${r.link}`).join('\n\n');
      const prospects = await extractWithClaude(snippetText, `LinkedIn search for: ${searchQuery}`);
      return Response.json({ prospects, meta: { method: 'linkedin_search', prospectsFound: prospects.length } });
    }

    return Response.json({ error: 'No valid input provided' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/prospector/scrape-linkedin',
};
