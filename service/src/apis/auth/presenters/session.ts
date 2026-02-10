import { base62 } from '@metorial/base62';
import type { IPInfo } from '@metorial/ip-info';
import { UAParser } from 'ua-parser-js';
import type { Device, DeviceUserSession } from '../../../prisma/generated';

export let sessionPresenter = (
  session: DeviceUserSession & { device: Device },
  ips: Record<string, IPInfo> = {}
) => {
  let ua = session.device.ua ? new UAParser(session.device.ua).getResult() : null;
  let ip = ips[session.device.ip];

  return {
    object: 'ares#user.session',

    id: session.id,

    status:
      session.loggedOutAt || session.expiresAt < new Date()
        ? ('logged_out' as const)
        : ('active' as const),

    device: {
      object: 'ares#user.session.device',

      id: session.device.id,

      browser: ua?.browser.name,
      os: ua?.os.name,
      country: ip?.country,

      machineId: `mtmac_${base62.encode(session.device.id.slice(-10) + JSON.stringify({ ip, ua }))}`,

      createdAt: session.device.createdAt
    },

    loggedInAt: session.createdAt,
    loggedOutAt: session.loggedOutAt,
    lastActiveAt: session.lastActiveAt
  };
};
