import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // In a real implementation, you would hash and compare the password
    // This is a simplified version - you should use bcrypt or similar
    if (data.password === password) {
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
