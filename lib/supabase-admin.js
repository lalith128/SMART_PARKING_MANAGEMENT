import { createClient } from '@supabase/supabase-js';
import { createHmac, scryptSync, timingSafeEqual } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const toBuffer = (value) => Buffer.from(value, 'utf8');

const safeEqual = (a, b) => {
  const aBuf = toBuffer(a);
  const bBuf = toBuffer(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

const base64UrlEncode = (input) => Buffer.from(input, 'utf8').toString('base64url');

const sign = (payload) => {
  if (!adminSessionSecret) {
    throw new Error('Missing ADMIN_SESSION_SECRET');
  }

  return createHmac('sha256', adminSessionSecret)
    .update(payload)
    .digest('base64url');
};

const verifyPassword = (storedPassword, plainPassword) => {
  if (!storedPassword || !plainPassword) return false;

  if (storedPassword.startsWith('scrypt$')) {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const computed = scryptSync(plainPassword, salt, 64).toString('hex');
    return safeEqual(hashHex, computed);
  }

  // Legacy fallback for existing plain-text rows.
  return safeEqual(storedPassword, plainPassword);
};

export const createAdminToken = ({ id, email }) => {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = base64UrlEncode(JSON.stringify({ id, email, exp }));
  const signature = sign(payload);
  return `${payload}.${signature}`;
};

export const verifyAdminToken = (token) => {
  if (!token || !token.includes('.')) return null;

  const [payload, signature] = token.split('.');
  const expectedSignature = sign(payload);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded?.id || !decoded?.email || !decoded?.exp) return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const verifyAdminCredentials = async (email, password) => {
  try {
    // Get the admin user
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      console.error('Admin verification error:', error);
      return { user: null, error: 'Invalid credentials' };
    }
    
    if (verifyPassword(data.password, password)) {
      return { user: { id: data.id, email: data.email }, error: null };
    } else {
      return { user: null, error: 'Invalid credentials' };
    }
  } catch (error) {
    console.error('Admin verification error:', error);
    return { user: null, error: 'Server error' };
  }
};

export { supabaseAdmin };
