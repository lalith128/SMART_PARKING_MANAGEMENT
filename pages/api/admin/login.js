import { verifyAdminCredentials } from '../../../lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { user, error } = await verifyAdminCredentials(email, password);
    
    if (error || !user) {
      return res.status(401).json({ error: error || 'Authentication failed' });
    }

    // Set a secure cookie for admin authentication
    res.setHeader('Set-Cookie', `admin-token=${user.id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);
    
    return res.status(200).json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
