import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to frontend format: { id, createdAt, data }
      const formattedData = data.map(item => ({
        id: item.id,
        createdAt: item.created_at,
        data: item.data
      }));

      return res.status(200).json(formattedData);
    } 
    
    if (method === 'POST') {
      const { mingguId, kumpulanId, data: reportData } = req.body;
      
      const { data, error } = await supabase
        .from('reports')
        .insert([
          { 
            minggu_id: mingguId, 
            kumpulan_id: kumpulanId, 
            data: reportData 
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        id: data.id,
        createdAt: data.created_at,
        data: data.data,
        status: "success"
      });
    }

    if (method === 'DELETE') {
      const { error } = await supabase
        .from('reports')
        .delete()
        .neq('id', 0); // Delete all

      if (error) throw error;

      return res.status(200).json({ status: "success" });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
