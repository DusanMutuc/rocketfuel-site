'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getDashboardPath } from '@/lib/dashboardRouting';

export default function Home() {
  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      router.replace(await getDashboardPath(session.user));
    };

    checkSession().catch(() => setErrorMsg('Could not load your dashboard. Please try again.'));
  }, [router]);

  return errorMsg ? (
    <p role="alert">{errorMsg} <a href="/">Retry</a></p>
  ) : <p>Loading...</p>;
}
