import type { AuthDevice, AuthDeviceUserSession, User } from '../../../../prisma/generated/client';
import { userPresenter } from './user';

export let devicePresenter = async (
  device: AuthDevice & { sessions: (AuthDeviceUserSession & { user: User })[] }
) => ({
  object: 'ares#device',

  id: device.id,

  createdAt: device.createdAt,
  updatedAt: device.updatedAt,
  lastActiveAt: device.lastActiveAt,

  sessions: await Promise.all(
    device.sessions.map(async (s: AuthDeviceUserSession & { user: User }) => ({
      object: 'ares#device.session',

      id: s.id,

      user: await userPresenter(s.user),

      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      loggedOutAt: s.loggedOutAt
    }))
  )
});

export let deviceLightPresenter = (device: AuthDevice) => ({
  object: 'ares#device(light)',

  id: device.id,

  createdAt: device.createdAt,
  updatedAt: device.updatedAt,
  lastActiveAt: device.lastActiveAt
});
