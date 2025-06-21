'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const superadminEmails = process.env.PUBLIC_NEXT_SUPERADMIN_EMAILS?.split(';');

  const handleLogin = async () => {
    setErrorMsg('');
    setLoading(true);

    // 1. Authenticate user
    const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    const user = authResult.user;
    if (!user || !user.id) {
      setErrorMsg('User ID not found after login.');
      setLoading(false);
      return;
    }

    // 2. If email matches superadmin, redirect immediately
    if (user.email && superadminEmails?.includes(user.email)) {

      router.push('/superadmin');
      setLoading(false);
      return;
    }

    // 3. Otherwise, check role via RPC
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id,
    });

    if (roleError || !roleData) {
      setErrorMsg('Could not fetch user role.');
      setLoading(false);
      return;
    }

    // 4. Redirect based on role
    if (roleData.role === 'admin') {
      router.push('/admin-dashboard');
    } else {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto' }}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 10 }}
      />
      <button onClick={handleLogin} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
    </div>
  );
}
