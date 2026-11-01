import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from './supabase';

export type Profile = { id: string; display_name: string; is_coach: boolean; invite_code: string | null };

/** Current auth session (null when signed out or when the backend isn't configured). */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    // Keep tokens fresh only while the app is in the foreground.
    const sub = AppState.addEventListener('change', (st) => (st === 'active' ? supabase!.auth.startAutoRefresh() : supabase!.auth.stopAutoRefresh()));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);
  return { session, ready };
}

export async function fetchProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from('profiles').select('id, display_name, is_coach, invite_code').eq('id', u.user.id).single();
  return (data as Profile) ?? null;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('not_configured');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, displayName: string) {
  if (!supabase) throw new Error('not_configured');
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
  if (error) throw error;
  /** False when the project requires email confirmation before the first sign-in. */
  return { signedIn: !!data.session };
}

export async function signOut() {
  await supabase?.auth.signOut();
}
