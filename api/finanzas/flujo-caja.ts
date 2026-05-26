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

  const now = new Date();
  const yearParam = (req.query['year'] as string | undefined);
  const monthParam = (req.query['month'] as string | undefined);
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

    if (error) return res.status(500).json({ error: error.message });

    const totalIncome = (transactions || [])
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalExpenses = (transactions || [])
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return res.status(200).json({
      period: { year, month },
      summary: { totalIncome, totalExpenses, balance: totalIncome - totalExpenses },
      transactions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}