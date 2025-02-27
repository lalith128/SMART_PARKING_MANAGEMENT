import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export function useAdmin() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const res = await fetch('/api/admin/verify');
        const data = await res.json();
        
        if (res.ok && data.user) {
          setAdmin(data.user);
        } else {
          setAdmin(null);
          // Redirect to login if not on the login page
          if (!router.pathname.includes('/admin/login')) {
            router.push('/admin/login');
          }
        }
      } catch (err) {
        setError(err.message);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    }

    verifyAdmin();
  }, [router]);

  const logout = async () => {
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      if (res.ok) {
        setAdmin(null);
        router.push('/admin/login');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return { admin, loading, error, logout };
}
