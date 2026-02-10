import type { DeviceUserSession, User } from '../../../prisma/generated';
import { userPresenter } from './user';

export let deviceUserPresenter = async (
  deviceUser: DeviceUserSession & { user: User }
) => ({
  object: 'ares#device.user',

  id: deviceUser.id,
  userId: deviceUser.userId,
  loggedInAt: deviceUser.createdAt,
  loggedOutAt: deviceUser.loggedOutAt,
  lastActiveAt: deviceUser.lastActiveAt,
  status:
    deviceUser.loggedOutAt || (deviceUser.expiresAt && deviceUser.expiresAt < new Date())
      ? ('logged_out' as const)
      : ('active' as const),

  user: await userPresenter(deviceUser.user)
});
