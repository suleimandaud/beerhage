import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

type Ctx = { session: Session | null; user: User | null; expoPushToken?: string };
const SessionCtx = createContext<Ctx>({ session: null, user: null });

export function useSession() { return useContext(SessionCtx); }

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [expoPushToken, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const register = async () => {
      if (!Device.isDevice) return;
      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } = existing !== 'granted' ? await Notifications.requestPermissionsAsync() : { status: existing };
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setToken(token);
      if (user?.id) {
        await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id);
      }
    };
    register();
  }, [user?.id]);

  return <SessionCtx.Provider value={{ session, user, expoPushToken }}>{children}</SessionCtx.Provider>;
}

// simple helper to show a local alert (we’ll trigger for weather/irrigation)
export async function localNotify(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
