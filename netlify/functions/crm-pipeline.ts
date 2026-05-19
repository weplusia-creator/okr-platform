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
    const activeStatuses = ['proposal', 'approved', 'in_progress', 'paused'];

    const { data: projects, error } = await db
      .from('projects')
      .select('id, name, status, product, monthly_fee, budget, start_date, estimated_end_date, created_at, clients(id, name)')
      .eq('organization_id', organizationId)
      .in('status', activeStatuses)
      .order('created_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const byStatus: Record<string, number> = {};
    for (const p of projects || []) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }

    return Response.json({
      total: (projects || []).length,
      byStatus,
      projects,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/crm/pipeline',
};
