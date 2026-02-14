let headers: Record<string, string> =
  process.env.NODE_ENV === 'production'
    ? {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-XSS-Protection': '0',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    : {};

export let withSecurityHeaders = (
  fetch: (req: Request, server: any) => Response | Promise<Response>
): ((req: Request, server: any) => Promise<Response>) => {
  return async (req, server) => {
    let res = await fetch(req, server);
    let patched = new Response(res.body, res);
    for (let [key, value] of Object.entries(headers)) {
      patched.headers.set(key, value);
    }
    return patched;
  };
};
