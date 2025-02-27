export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear the admin token cookie
  res.setHeader('Set-Cookie', 'admin-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
  
  return res.status(200).json({ success: true });
}
