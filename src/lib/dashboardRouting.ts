import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export async function getDashboardPath(user: Pick<User, 'id' | 'email'>) {
  const superadminEmails = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ?? '')
    .split(';')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && superadminEmails.includes(user.email.toLowerCase())) {
    return '/superadmin';
  }

  const { data, error } = await supabase.rpc('get_user_role', {
    user_id: user.id,
  });

  if (error || !data) {
    throw new Error('Could not fetch user role. Please try again.');
  }

  const result = Array.isArray(data) ? data[0] : data;
  const role = typeof result === 'string' ? result : result?.role;

  if (!role) {
    throw new Error('Could not fetch user role. Please try again.');
  }

  if (role === 'superadmin') return '/superadmin';
  if (role === 'admin') return '/admin-dashboard';
  return '/dashboard';
}
