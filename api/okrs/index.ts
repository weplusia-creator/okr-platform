import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = (req.headers['authorization'] as string | undefined);
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return res.status(401).json({ error: 'Invalid service role key' });
  }

  const organizationId = (req.query['organization_id'] as string) || '';
  if (!organizationId) return res.status(400).json({ error: 'organization_id query param is required' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const db = createClient(supabaseUrl, serviceRoleKey);

  const quarter = (req.query['quarter'] as string | undefined) || undefined;
  const yearParam = (req.query['year'] as string | undefined);
  const year = yearParam ? Number(yearParam) : undefined;

  try {
    let query = db
      .from('objectives')
      .select('*')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false });

    if (quarter) query = query.eq('quarter', quarter);
    if (year) query = query.eq('year', year);

    const { data: objectives, error: objErr } = await query;
    if (objErr) return res.status(500).json({ error: objErr.message });

    const objectiveIds = (objectives || []).map((o: any) => o.id);

    let keyResults: any[] = [];
    if (objectiveIds.length > 0) {
      const { data, error: krErr } = await db
        .from('key_results')
        .select('*')
        .in('objective_id', objectiveIds);

      if (krErr) return res.status(500).json({ error: krErr.message });
      keyResults = data || [];
    }

    const krByObjective: Record<string, any[]> = {};
    for (const kr of keyResults) {
      if (!krByObjective[kr.objective_id]) krByObjective[kr.objective_id] = [];
      krByObjective[kr.objective_id].push(kr);
    }

    const result = (objectives || []).map((o: any) => {
      const krs = krByObjective[o.id] || [];
      const avgProgress = krs.length > 0
        ? Math.round(krs.reduce((sum: number, kr: any) => sum + (kr.progress || 0), 0) / krs.length)
        : 0;

      return { ...o, key_results: krs, progress: avgProgress };
    });

    return res.status(200).json({ total: result.length, objectives: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}