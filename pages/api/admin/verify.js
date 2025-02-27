import { supabaseAdmin } from '../../../lib/supabase-admin';

export default async function handler(req, res) {
  try {
    // Extract the admin token from cookies
    const adminToken = req.cookies['admin-token'];
    
    if (!adminToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify the admin token against the database
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email')
      .eq('id', adminToken)
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
