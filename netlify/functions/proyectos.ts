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

  try {
    const { data: projects, error: projErr } = await db
      .from('projects')
      .select('id, name, description, status, product, monthly_fee, budget, estimated_cost, start_date, estimated_end_date, actual_end_date, notes, created_at, updated_at, clients(id, name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (projErr) return Response.json({ error: projErr.message }, { status: 500 });

    const projectIds = (projects || []).map((p: any) => p.id);

    let payments: any[] = [];
    if (projectIds.length > 0) {
      const { data, error: payErr } = await db
        .from('project_payments')
        .select('id, project_id, month, amount, status, paid_date, notes')
        .in('project_id', projectIds)
        .order('month');

      if (payErr) return Response.json({ error: payErr.message }, { status: 500 });
      payments = data || [];
    }

    const paymentsByProject: Record<string, any[]> = {};
    for (const p of payments) {
      if (!paymentsByProject[p.project_id]) paymentsByProject[p.project_id] = [];
      paymentsByProject[p.project_id].push(p);
    }

    const result = (projects || []).map((p: any) => ({
      ...p,
      payments: paymentsByProject[p.id] || [],
    }));

    return Response.json({ total: result.length, projects: result });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/proyectos',
};
