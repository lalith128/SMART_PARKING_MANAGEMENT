
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, User, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, createAdminUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('Attempting admin login with:', { username, password });

    try {
      // Validate admin credentials
      if (username !== 'admin' || password !== 'admin123') {
        console.log('Invalid admin credentials');
        toast.error('Invalid admin credentials');
        setLoading(false);
        return;
      }

      // Try to create admin user first (will fail if already exists)
      try {
        await createAdminUser();
        console.log('Admin user created successfully');
      } catch (error) {
        console.log('Admin user might already exist:', error);
        // Ignore error as user might already exist
      }

      // Using signIn from AuthContext for consistency
      console.log('Attempting Supabase auth...');
      const { data, error } = await signIn('admin@parkease.com', 'admin123');

      if (error) {
        console.error('Supabase auth error:', error);
        toast.error('Authentication failed');
        setLoading(false);
        return;
      }

      console.log('Auth successful:', data);

      if (data?.user) {
        console.log('Updating admin profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: 'Admin',
            role: 'admin',
            phone_number: '',
            email: data.user.email
          });

        if (profileError) {
          console.error('Profile update error:', profileError);
          toast.error('Failed to update admin profile');
          setLoading(false);
          return;
        }

        console.log('Admin profile updated successfully');
        toast.success('Successfully logged in as admin');
        navigate('/dashboard/admin');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            Admin Login
          </CardTitle>
          <CardDescription className="text-gray-500">
            Access the admin dashboard to manage users and parking spaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 py-6"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 py-6"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-6"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login as Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
