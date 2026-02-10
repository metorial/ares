import { useMutation } from '@metorial-io/data-hooks';
import { useEffect, useRef } from 'react';
import { authState } from '../state/auth';

export let Internal = () => {
  let auth = authState.use({});
  let startAuthentication = useMutation(auth.mutators.start);

  let authenticatingRef = useRef(false);

  useEffect(() => {
    if (authenticatingRef.current) return;

    let hash = window.location.hash;
    let parsedHash = new URLSearchParams(hash.slice(1));
    let token = parsedHash.get('token');

    if (token && auth.data?.defaultRedirectUrl) {
      authenticatingRef.current = true;

      startAuthentication.mutate({
        type: 'internal',
        token,
        redirectUrl: auth.data.defaultRedirectUrl
      });
    }

    // Clear the hash
    window.location.hash = '';
  }, [auth.data?.defaultRedirectUrl]);

  return null;
};
