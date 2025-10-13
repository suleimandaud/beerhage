import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setRole(data.role);
        }
      }
    };

    fetchUser();
  }, []);

  return { user, role };
}
