import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private expo: Expo;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {
    this.expo = new Expo();
  }

  async registerPushToken(userId: string, token: string) {
    if (!Expo.isExpoPushToken(token)) {
      throw new Error(
        'Push token ' + String(token) + ' is not a valid Expo push token',
      );
    }

    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: {
        token,
        userId,
      },
    });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
  ) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
    });

    if (!tokens.length) {
      this.logger.debug('No push tokens found for user ' + String(userId));
      return;
    }

    const messages: ExpoPushMessage[] = [];
    for (const pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken.token)) {
        this.logger.error(
          'Push token ' +
            String(pushToken.token) +
            ' is not a valid Expo push token',
        );
        continue;
      }

      messages.push({
        to: pushToken.token,
        sound: 'default',
        title,
        body,
        data,
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error('Error sending push notifications', error);
      }
    }

    // In a real app, we should check tickets for errors and remove invalid tokens
    // but for now, we'll just log any issues.
  }
}
