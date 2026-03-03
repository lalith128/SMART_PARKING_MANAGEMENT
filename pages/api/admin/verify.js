import { supabaseAdmin, verifyAdminToken } from '../../../lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.cookies['__Host-admin-token'];
    
    if (!adminToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = verifyAdminToken(adminToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email')
      .eq('id', payload.id)
      .eq('email', payload.email)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Return the admin user information (excluding sensitive data)
    return res.status(200).json({ user: { id: data.id, email: data.email } });
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
