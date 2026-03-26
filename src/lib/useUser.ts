import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;

      if (!mounted) return;

      setUser(u);

      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', u.id)
        .single();

      if (!mounted) return;

      setRole(!error ? (profile?.role ?? null) : null);
      setLoading(false);
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, role, loading };
}
