'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const superadminEmails = process.env.PUBLIC_NEXT_SUPERADMIN_EMAILS?.split(';');

      if (session?.user.email && superadminEmails?.includes(session?.user.email)) {
        router.push('/superadmin');
        return;
      }

      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
        user_id: session?.user.id,
      });

      if (roleData.role === 'admin') {
        router.push('/admin-dashboard');
        return;
      }

      router.push('/dashboard');
    };

    checkSession();
  }, [router]);

  return null;
}
