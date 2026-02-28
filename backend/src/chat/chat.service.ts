import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const { targetUserId, matchRequestId, parcelRequestId } = dto;
    
    // Check if conversation exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId },
        ],
        matchRequestId: matchRequestId || null,
        parcelRequestId: parcelRequestId || null,
      },
      include: {
        user1: true,
        user2: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing) return existing;

    const conversation = await this.prisma.conversation.create({
      data: {
        user1Id: userId,
        user2Id: targetUserId,
        matchRequestId,
        parcelRequestId,
      },
      include: {
        user1: true,
        user2: true,
      },
    });
    
    return conversation;
  }

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, fullName: true } },
        user2: { select: { id: true, fullName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string, userId: string) {
    // Verify participation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, fullName: true } } },
    });
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const { conversationId, content } = dto;
    
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new BadRequestException('Not a participant');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
      },
      include: { sender: { select: { id: true, fullName: true } } },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Notify recipient via socket
    const recipientId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
    this.chatGateway.sendToUser(recipientId, 'newMessage', message);

    // Send Push Notification
    await this.notificationsService.sendPushNotification(
      recipientId,
      `New message from ${message.sender.fullName}`,
      message.content,
      { conversationId, type: 'chat_message' },
    );
    
    return message;
  }
}
