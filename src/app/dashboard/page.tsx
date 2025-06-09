'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import UserDetailView from '@/components/UserDetailView';

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
      } else {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, [router]);

  if (!userId) return <p>Loading...</p>;

  return <UserDetailView userId={userId} />;
}
