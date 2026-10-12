import notifee, {
  AndroidColor,
  AuthorizationStatus,
} from 'react-native-notify-kit';

export const CONNECTED_CHANNEL_ID = 'media';
export const CONNECTED_NOTIFICATION_ID = 'peyara-connected';

export async function ensureNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CONNECTED_CHANNEL_ID,
    name: 'Media controls',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function showConnectedNotification(): Promise<void> {
  await ensureNotificationChannel();
  await notifee.cancelAllNotifications();
  await notifee.displayNotification({
    id: CONNECTED_NOTIFICATION_ID,
    title: 'Peyara Remote Mouse',
    body: 'Connected',
    android: {
      channelId: CONNECTED_CHANNEL_ID,
      actions: [
        {
          title: 'Play/Pause',
          pressAction: {id: 'play', launchActivity: 'none'},
        },
        {
          title: 'Mute',
          pressAction: {id: 'mute'},
        },
      ],
      color: AndroidColor.RED,
      colorized: true,
      autoCancel: false,
    },
  });
}

export async function hideConnectedNotification(): Promise<void> {
  await notifee.cancelAllNotifications();
}

/** Maps a notification action id to the media-key sent to the desktop. */
export function getMediaKeyForAction(actionId?: string): string | null {
  switch (actionId) {
    case 'play':
      return 'audio_play';
    case 'mute':
      return 'audio_mute';
    default:
      return null;
  }
}
