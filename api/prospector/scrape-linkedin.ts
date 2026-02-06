import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateCaller, extractProspectsWithClaude, googleSearch } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateCaller(req);
  } catch (e: any) {
    return res.status(401).json({ error: e.message });
  }

  const { url, searchQuery, rawText } = req.body;

  if (!url && !searchQuery && !rawText) {
    return res.status(400).json({ error: 'Provide url, searchQuery, or rawText' });
  }

  try {
    // Mode 1: User pasted raw LinkedIn text (always works)
    if (rawText && typeof rawText === 'string') {
      const prospects = await extractProspectsWithClaude(
        rawText,
        'This is raw text copied from LinkedIn profile(s). Extract all contact/company data.',
      );
      return res.status(200).json({
        prospects,
        meta: { method: 'raw_text', prospectsFound: prospects.length },
      });
    }

    // Mode 2: Proxycurl API for LinkedIn URL (if API key configured)
    if (url && typeof url === 'string') {
      const proxycurlKey = process.env.PROXYCURL_API_KEY || '';

      if (proxycurlKey) {
        try {
          const apiUrl = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(url)}`;
          const proxyRes = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${proxycurlKey}` },
          });

          if (proxyRes.ok) {
            const profile = await proxyRes.json();
            const prospect = {
              companyName: profile.experiences?.[0]?.company || profile.company || 'Unknown',
              contactName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
              contactTitle: profile.headline || profile.experiences?.[0]?.title || null,
              email: profile.personal_emails?.[0] || null,
              phone: profile.personal_numbers?.[0] || null,
              linkedinUrl: url,
              website: profile.experiences?.[0]?.company_linkedin_profile_url || null,
              industry: profile.industry || null,
              companySize: null,
              country: profile.country_full_name || null,
              city: profile.city || null,
              notes: profile.summary || null,
            };
            return res.status(200).json({
              prospects: [prospect],
              meta: { method: 'proxycurl', prospectsFound: 1 },
            });
          }
        } catch {
          // Fall through to Google fallback
        }
      }

      // Fallback: search Google for the LinkedIn profile
      try {
        const googleResults = await googleSearch(`site:linkedin.com ${url}`, 3);
        const snippetText = googleResults
          .map(r => `${r.title}\n${r.snippet}\n${r.link}`)
          .join('\n\n');

        if (snippetText.length > 20) {
          const prospects = await extractProspectsWithClaude(
            snippetText,
            'Extract LinkedIn profile data from these Google search results.',
          );
          // Set LinkedIn URL on extracted prospects
          const enriched = prospects.map(p => ({
            ...p,
            linkedinUrl: p.linkedinUrl || url,
          }));
          return res.status(200).json({
            prospects: enriched,
            meta: { method: 'google_cache', prospectsFound: enriched.length },
          });
        }
      } catch {
        // Google search failed
      }

      return res.status(422).json({
        error: 'Could not extract data from this LinkedIn URL. Try pasting the profile text directly.',
      });
    }

    // Mode 3: Google search for LinkedIn profiles
    if (searchQuery && typeof searchQuery === 'string') {
      const query = `site:linkedin.com/in/ ${searchQuery}`;
      const googleResults = await googleSearch(query, 10);

      if (googleResults.length === 0) {
        return res.status(200).json({
          prospects: [],
          meta: { method: 'linkedin_search', query, prospectsFound: 0 },
        });
      }

      const snippetText = googleResults
        .map(r => `Profile: ${r.title}\n${r.snippet}\nURL: ${r.link}`)
        .join('\n\n');

      const prospects = await extractProspectsWithClaude(
        snippetText,
        `LinkedIn search for: ${searchQuery}. Extract profile data from these Google snippets. Set linkedinUrl from the URL field.`,
      );

      return res.status(200).json({
        prospects,
        meta: { method: 'linkedin_search', query, prospectsFound: prospects.length },
      });
    }

    return res.status(400).json({ error: 'No valid input provided' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
