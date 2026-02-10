import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authState } from '../state/auth';
import { AuthHomeScene } from './authHome';
import { AuthIntentScene } from './authIntent';

export let AuthScene = ({ type }: { type: 'login' | 'signup' | 'switch' }) => {
  let [searchParams] = useSearchParams();
  let auth = authState.use({});

  let email = searchParams.get('email');
  let nextUrl =
    searchParams.get('nextUrl') ??
    searchParams.get('next_url') ??
    searchParams.get('redirect_url') ??
    searchParams.get('redirect_uri') ??
    auth.data?.defaultRedirectUrl;
  let sessionOrUserId = searchParams.get('user_id') ?? searchParams.get('session_id');

  if (!email && nextUrl) {
    try {
      let parsedNextUrl = new URL(nextUrl);
      email = parsedNextUrl.searchParams.get('email') ?? email;
    } catch {}
  }

  let [authIntent, setAuthIntent] = useState<{
    authIntentId: string;
    authIntentClientSecret: string;
  } | null>(null);

  if (authIntent) {
    return <AuthIntentScene {...authIntent} />;
  }

  return (
    <AuthHomeScene
      nextUrl={nextUrl ?? 'https://metorial.com'}
      email={email ?? undefined}
      type={type}
      setAuthIntent={setAuthIntent}
      sessionOrUserId={sessionOrUserId ?? undefined}
    />
  );
};
