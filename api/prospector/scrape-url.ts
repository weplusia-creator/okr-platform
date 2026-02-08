import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateCaller, stripHtmlToText, extractProspectsWithClaude } from '../../lib/prospector';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateCaller(req);
  } catch (e: any) {
    return res.status(401).json({ error: e.message });
  }

  const { url, extractionHint } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate URL
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProspectorBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch URL: HTTP ${response.status}` });
    }

    const html = await response.text();
    const text = stripHtmlToText(html);

    if (text.length < 50) {
      return res.status(422).json({ error: 'Page has too little text content to extract prospects' });
    }

    const prospects = await extractProspectsWithClaude(text, extractionHint);

    return res.status(200).json({
      prospects,
      meta: {
        url,
        textLength: text.length,
        prospectsFound: prospects.length,
      },
    });
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'URL fetch timed out' });
    }
    return res.status(500).json({ error: e.message });
  }
}
