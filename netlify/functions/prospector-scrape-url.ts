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
  const { url } = body;
  if (!url || typeof url !== 'string') return Response.json({ error: 'URL is required' }, { status: 400 });
  try { new URL(url); } catch { return Response.json({ error: 'Invalid URL format' }, { status: 400 }); }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProspectorBot/1.0)', 'Accept': 'text/html,*/*;q=0.8' },
    });
    clearTimeout(timeout);

    if (!response.ok) return Response.json({ error: `Failed to fetch URL: HTTP ${response.status}` }, { status: 502 });

    const html = await response.text();
    const text = stripHtmlToText(html);
    if (text.length < 50) return Response.json({ error: 'Page has too little text content' }, { status: 422 });

    return Response.json({ text, meta: { url, textLength: text.length } });
  } catch (e: any) {
    if (e.name === 'AbortError') return Response.json({ error: 'URL fetch timed out' }, { status: 504 });
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/prospector/scrape-url',
};
