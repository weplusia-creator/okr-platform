import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

// ===== Shared types =====

export interface ExtractedProspect {
  companyName: string;
  contactName: string;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
}

// ===== Auth helper =====

export async function authenticateCaller(req: VercelRequest): Promise<{ userId: string; organizationId: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Unauthorized');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const token = authHeader.replace('Bearer ', '');

  // Use the user's own token to authenticate and query (respects RLS)
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');

  const { data: userData } = await client.from('users').select('organization_id').eq('id', user.id).single();
  if (!userData?.organization_id) throw new Error('User has no organization');

  return { userId: user.id, organizationId: userData.organization_id };
}

// ===== HTML stripping =====

export function stripHtmlToText(html: string, maxChars: number = 80000): string {
  let text = html;
  // Remove script, style, nav, footer, header tags and their contents
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  // Replace br/hr with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n');
  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();
  return text.slice(0, maxChars);
}

// ===== Claude extraction =====

export async function extractProspectsWithClaude(
  text: string,
  hint?: string,
): Promise<ExtractedProspect[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const prompt = `Eres un experto en extraccion de datos B2B. Analiza el siguiente texto y extrae TODOS los prospectos/empresas/contactos que encuentres.

${hint ? `CONTEXTO DEL USUARIO: ${hint}\n` : ''}
TEXTO A ANALIZAR:
${text}

Extrae la mayor cantidad de prospectos posible. Para cada uno, intenta obtener:
- companyName (obligatorio - nombre de la empresa)
- contactName (obligatorio - nombre del contacto, si no hay usa "N/A")
- contactTitle (cargo/titulo)
- email
- phone (telefono)
- linkedinUrl (URL de LinkedIn)
- website (sitio web de la empresa)
- industry (industria/sector)
- companySize (tamaño: 1-9, 10-49, 50-99, 100-499, 500-999, 1000+)
- country (pais)
- city (ciudad)
- notes (notas adicionales relevantes)

Responde UNICAMENTE con un JSON array. Si no encuentras prospectos, responde con [].
Ejemplo: [{"companyName":"Acme Corp","contactName":"Juan Perez","contactTitle":"CEO","email":"juan@acme.com","phone":null,"linkedinUrl":null,"website":"https://acme.com","industry":"Technology","companySize":"50-99","country":"Argentina","city":"Buenos Aires","notes":null}]`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || '[]';

  // Extract JSON array from response (Claude may wrap it in markdown)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p: any) => p.companyName)
      .map((p: any): ExtractedProspect => ({
        companyName: String(p.companyName || ''),
        contactName: String(p.contactName || 'N/A'),
        contactTitle: p.contactTitle || null,
        email: p.email || null,
        phone: p.phone || null,
        linkedinUrl: p.linkedinUrl || null,
        website: p.website || null,
        industry: p.industry || null,
        companySize: p.companySize || null,
        country: p.country || null,
        city: p.city || null,
        notes: p.notes || null,
      }));
  } catch {
    return [];
  }
}

// ===== Google Custom Search =====

export async function googleSearch(
  query: string,
  maxResults: number = 10,
): Promise<{ title: string; link: string; snippet: string }[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || '';
  const cseId = process.env.GOOGLE_CSE_ID || '';
  if (!apiKey || !cseId) throw new Error('Google Search API not configured (GOOGLE_SEARCH_API_KEY, GOOGLE_CSE_ID)');

  const results: { title: string; link: string; snippet: string }[] = [];
  const pages = Math.ceil(Math.min(maxResults, 30) / 10);

  for (let page = 0; page < pages; page++) {
    const start = page * 10 + 1;
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cseId)}&q=${encodeURIComponent(query)}&start=${start}&num=10`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    for (const item of data.items || []) {
      results.push({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
      });
    }
  }

  return results.slice(0, maxResults);
}
