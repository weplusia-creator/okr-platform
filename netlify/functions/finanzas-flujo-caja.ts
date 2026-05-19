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

  const now = new Date();
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  try {
    const { data: transactions, error } = await db
      .from('cash_flow_transactions')
      .select('*, cash_flow_categories(name, color), clients(name), projects(name)')
      .eq('organization_id', organizationId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const totalIncome = (transactions || [])
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalExpenses = (transactions || [])
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return Response.json({
      period: { year, month },
      summary: { totalIncome, totalExpenses, balance: totalIncome - totalExpenses },
      transactions,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/finanzas/flujo-caja',
};
