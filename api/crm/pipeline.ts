import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return res.status(401).json({ error: 'Invalid service role key' });
  }

  const organizationId = req.query.organization_id as string;
  if (!organizationId) return res.status(400).json({ error: 'organization_id query param is required' });

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

    if (error) return res.status(500).json({ error: error.message });

    const byStatus: Record<string, number> = {};
    for (const p of projects || []) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }

    return res.status(200).json({
      total: (projects || []).length,
      byStatus,
      projects,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
