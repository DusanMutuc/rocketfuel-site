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

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const superadminEmails = process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS?.split(';');

  const handleLogin = async () => {
    setErrorMsg('');
    setLoading(true);

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

    if (user.email && superadminEmails?.includes(user.email)) {
      router.push('/superadmin');
      setLoading(false);
      return;
    }

    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id,
    });

    if (roleError || !roleData) {
      setErrorMsg('Could not fetch user role.');
      setLoading(false);
      return;
    }

    if (roleData.role === 'admin') {
      router.push('/admin-dashboard');
    } else {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  const handleSendReset = async () => {
    setForgotError(null);
    setForgotMessage(null);
    setForgotLoading(true);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail || email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) setForgotError(error.message);
    else setForgotMessage('If this email exists, a reset link has been sent.');

    setForgotLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', position: 'relative' }}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        style={{ display: 'block', width: '100%', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="current-password"
        style={{ display: 'block', width: '100%', marginBottom: 10 }}
      />

      <div style={{ textAlign: 'right', marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => { setShowForgot(true); setForgotEmail(email); }}
          style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Forgot password?
        </button>
      </div>

      <button onClick={handleLogin} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {errorMsg && <p style={{ color: 'red', marginTop: 8 }}>{errorMsg}</p>}

      {/* Minimal modal */}
      {showForgot && (
        <div
          onClick={() => { if (!forgotLoading) setShowForgot(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 8, padding: 16, width: '100%', maxWidth: 420 }}
          >
            <h3 style={{ marginTop: 0 }}>Reset password</h3>
            <input
              type="email"
              placeholder="Your email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 10 }}
              disabled={forgotLoading}
            />
            {forgotError && <p style={{ color: 'red', marginBottom: 8 }}>{forgotError}</p>}
            {forgotMessage && <p style={{ color: 'green', marginBottom: 8 }}>{forgotMessage}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => !forgotLoading && setShowForgot(false)}
                disabled={forgotLoading}
                style={{ padding: '8px 12px' }}
              >
                Close
              </button>
              <button
                onClick={handleSendReset}
                disabled={forgotLoading || !forgotEmail}
                style={{ padding: '8px 12px' }}
              >
                {forgotLoading ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
