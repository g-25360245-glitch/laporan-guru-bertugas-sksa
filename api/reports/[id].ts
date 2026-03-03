import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const { id } = req.query;

  if (method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ status: "success" });
    } catch (error: any) {
      console.error('API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
