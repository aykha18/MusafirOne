export type ExpoPushMessage = any;
export type ExpoPushTicket = any;

export class Expo {
  static isExpoPushToken(token: unknown) {
    void token;
    return true;
  }

  chunkPushNotifications(messages: unknown[]) {
    return [messages];
  }

  sendPushNotificationsAsync(chunk: unknown[]) {
    void chunk;
    return Promise.resolve([]);
  }
}
