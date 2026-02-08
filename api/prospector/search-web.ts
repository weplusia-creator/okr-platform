import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateCaller, stripHtmlToText, extractProspectsWithClaude, googleSearch } from '../../lib/prospector';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateCaller(req);
  } catch (e: any) {
    return res.status(401).json({ error: e.message });
  }

  const { query, industry, country, maxResults = 5 } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' });
  }

  // Build enriched search query
  let searchQuery = query;
  if (industry) searchQuery += ` ${industry}`;
  if (country) searchQuery += ` ${country}`;

  try {
    const searchResults = await googleSearch(searchQuery, Math.min(maxResults, 10));

    if (searchResults.length === 0) {
      return res.status(200).json({ prospects: [], meta: { query: searchQuery, pagesScraped: 0, prospectsFound: 0 } });
    }

    // Fetch and combine text from all result pages (with per-page timeout)
    const pageTexts: string[] = [];
    for (const result of searchResults.slice(0, 5)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const pageRes = await fetch(result.link, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ProspectorBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          },
        });
        clearTimeout(timeout);

        if (pageRes.ok) {
          const html = await pageRes.text();
          const text = stripHtmlToText(html, 15000);
          if (text.length > 50) {
            pageTexts.push(`--- SOURCE: ${result.title} (${result.link}) ---\n${text}`);
          }
        }
      } catch {
        // Skip failed pages, use snippet as fallback
        if (result.snippet) {
          pageTexts.push(`--- SOURCE: ${result.title} (${result.link}) ---\n${result.snippet}`);
        }
      }
    }

    if (pageTexts.length === 0) {
      // Fallback: extract from Google snippets only
      const snippetText = searchResults
        .map(r => `${r.title}: ${r.snippet} (${r.link})`)
        .join('\n');
      const prospects = await extractProspectsWithClaude(snippetText, `Search query: ${searchQuery}`);
      return res.status(200).json({
        prospects,
        meta: { query: searchQuery, pagesScraped: 0, prospectsFound: prospects.length },
      });
    }

    const combinedText = pageTexts.join('\n\n').slice(0, 80000);
    const prospects = await extractProspectsWithClaude(combinedText, `Search query: ${searchQuery}`);

    return res.status(200).json({
      prospects,
      meta: {
        query: searchQuery,
        pagesScraped: pageTexts.length,
        prospectsFound: prospects.length,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
