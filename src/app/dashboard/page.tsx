'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import UserDetailView from '@/components/UserDetailView';
import { getDashboardPath } from '@/lib/dashboardRouting';

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
      } else {
        const path = await getDashboardPath(session.user);
        if (path !== '/dashboard') {
          router.replace(path);
        } else {
          setUserId(session.user.id);
        }
      }
    };
    getUser().catch(() => setErrorMsg('Could not load your dashboard. Please try again.'));
  }, [router]);

  if (errorMsg) return <p role="alert">{errorMsg} <a href="/dashboard">Retry</a></p>;
  if (!userId) return <p>Loading...</p>;

  return <UserDetailView userId={userId} />;
}
