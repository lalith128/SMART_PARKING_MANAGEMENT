import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Users,
  Building2,
  Car,
  Ban,
  CheckCircle,
  Trash2,
  Search,
  UserCog,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/contexts/AuthContext';

// Admin credentials (in production, this should be in a secure environment variable)
const ADMIN_USERNAME = 'Nalesh';
const ADMIN_PASSWORD = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpxD2nPTOybF9y'; // Hashed version of "12345678q@"

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'owner';
  is_banned: boolean;
  created_at: string;
}

interface ParkingSpace {
  id: string;
  address: string;
  district: string;
  state: string;
  owner_id: string;
  hourly_rate: number;
  created_at: string;
}

export default function AdminDashboard(): JSX.Element {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOwners: 0,
    totalParkingSpaces: 0,
    bannedUsers: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      // Load parking spaces
      const { data: spacesData, error: spacesError } = await supabase
        .from('parking_spaces')
        .select('*');

      if (spacesError) throw spacesError;

      setUsers(usersData || []);
      setParkingSpaces(spacesData || []);

      // Calculate stats
      setStats({
        totalUsers: usersData?.filter(u => u.role === 'user').length || 0,
        totalOwners: usersData?.filter(u => u.role === 'owner').length || 0,
        totalParkingSpaces: spacesData?.length || 0,
        bannedUsers: usersData?.filter(u => u.is_banned).length || 0,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !isBanned })
        .eq('id', userId);

      if (error) throw error;

      toast.success(\`User successfully \${isBanned ? 'unbanned' : 'banned'}\`);
      loadData();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteParkingSpace = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this parking space? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('parking_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;

      toast.success('Parking space deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting parking space:', error);
      toast.error('Failed to delete parking space');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredParkingSpaces = parkingSpaces.filter(space =>
    space.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be logged in as an admin to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Dashboard Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage users, owners, and parking spaces across the platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Total Users</h3>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{stats.totalUsers}</span>
                <span className="ml-2 text-sm text-gray-500">users</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Total Owners</h3>
                <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{stats.totalOwners}</span>
                <span className="ml-2 text-sm text-gray-500">owners</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Parking Spaces</h3>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{stats.totalParkingSpaces}</span>
                <span className="ml-2 text-sm text-gray-500">spaces</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Banned Users</h3>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Ban className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{stats.bannedUsers}</span>
                <span className="ml-2 text-sm text-gray-500">banned</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search users, owners, or parking spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Users & Owners Table */}
        <Card className="border-0 shadow-xl mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              Users & Owners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'owner' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'owner' ? (
                          <UserCog className="w-3 h-3 mr-1" />
                        ) : (
                          <Users className="w-3 h-3 mr-1" />
                        )}
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_banned
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.is_banned ? (
                          <>
                            <Ban className="w-3 h-3 mr-1" />
                            Banned
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBanUser(user.id, user.is_banned)}
                        className={user.is_banned ? 'text-green-600' : 'text-red-600'}
                      >
                        {user.is_banned ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Unban
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Parking Spaces Table */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-purple-600" />
              Parking Spaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Rate/Hour</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParkingSpaces.map((space) => (
                  <TableRow key={space.id}>
                    <TableCell className="font-medium">{space.address}</TableCell>
                    <TableCell>{space.district}</TableCell>
                    <TableCell>{space.state}</TableCell>
                    <TableCell>₹{space.hourly_rate}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteParkingSpace(space.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 