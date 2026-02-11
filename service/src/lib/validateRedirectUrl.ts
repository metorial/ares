import { badRequestError, ServiceError } from '@lowerdeck/error';

export let validateRedirectUrl = (redirectUrl: string, redirectDomains: string[]) => {
  if (redirectDomains.length === 0) return;

  let url: URL;
  try {
    url = new URL(redirectUrl);
  } catch {
    throw new ServiceError(badRequestError({ message: 'Invalid redirect URL' }));
  }

  let hostname = url.hostname;

  for (let pattern of redirectDomains) {
    if (pattern.startsWith('*.')) {
      let suffix = pattern.slice(1); // e.g. ".example.com"
      if (hostname.endsWith(suffix) && hostname.length > suffix.length) {
        return;
      }
    } else {
      if (hostname === pattern) return;
    }
  }

  throw new ServiceError(badRequestError({ message: 'Redirect URL domain not allowed' }));
};
