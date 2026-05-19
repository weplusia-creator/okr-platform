import { createClient } from '@supabase/supabase-js';
import type { Context, Config } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return Response.json({ error: 'Invalid service role key' }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get('organization_id') || '';
  if (!organizationId) return Response.json({ error: 'organization_id query param is required' }, { status: 400 });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const db = createClient(supabaseUrl, serviceRoleKey);

  const quarter = url.searchParams.get('quarter') || undefined;
  const yearParam = url.searchParams.get('year');
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
    if (objErr) return Response.json({ error: objErr.message }, { status: 500 });

    const objectiveIds = (objectives || []).map((o: any) => o.id);

    let keyResults: any[] = [];
    if (objectiveIds.length > 0) {
      const { data, error: krErr } = await db
        .from('key_results')
        .select('*')
        .in('objective_id', objectiveIds);

      if (krErr) return Response.json({ error: krErr.message }, { status: 500 });
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

    return Response.json({ total: result.length, objectives: result });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/okrs',
};
