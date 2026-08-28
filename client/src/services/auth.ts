import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in bypass mode (demo server)
// Only use bypass mode if Supabase credentials are missing
const isBypassMode = !supabaseUrl || !supabaseAnonKey;

let supabase: any = null;

if (!isBypassMode && supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export interface AuthUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

// Mock user for bypass mode
const mockUser: AuthUser = {
  id: 'demo-user-001',
  email: 'demo@investigator.gov',
  emailConfirmed: true,
};

export async function signIn(email: string, password: string) {
  if (isBypassMode) {
    // In bypass mode, validate basic credentials
    if (!email || !password || password.length < 6) {
      throw new Error('Invalid credentials');
    }
    return mockUser;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

export async function signUp(email: string, password: string) {
  if (isBypassMode) {
    // In bypass mode, just return mock user
    return mockUser;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (isBypassMode) {
    // In bypass mode, just clear local state
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isBypassMode) {
    // In bypass mode, return null (user needs to "sign in" via login page)
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user ? {
    id: user.id,
    email: user.email!,
    emailConfirmed: user.email_confirmed ?? false,
  } : null;
}

export async function onAuthStateChange(callback: (user: AuthUser | null) => void): Promise<() => void> {
  if (isBypassMode) {
    // In bypass mode, no auth state changes
    return Promise.resolve(() => {});
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
    const user = session?.user ? {
      id: session.user.id,
      email: session.user.email!,
      emailConfirmed: session.user.email_confirmed ?? false,
    } : null;
    callback(user);
  });

  return Promise.resolve(() => {
    if (subscription) subscription.unsubscribe();
  });
}