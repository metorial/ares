import { normalizeEmail } from './normalizeEmail';

export let parseEmail = (emailRaw: string) => {
  let email = emailRaw.toLowerCase().trim();
  let [local, domain] = email.split('@');

  return {
    email,
    domain,
    normalizedEmail: normalizeEmail(email)
  };
};
