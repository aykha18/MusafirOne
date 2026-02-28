import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1];
      if (!token) {
        // Allow connection without token? No, secure chat.
        // client.disconnect(); 
        // return;
        // For debugging, maybe log it.
        console.log(`Client connected without token: ${client.id}`);
        return;
      }
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'dev_jwt_secret' });
      client.data.user = payload;
      await client.join(`user_${payload.sub}`);
      console.log(`Client connected: ${client.id}, User: ${payload.sub}`);
    } catch (e) {
      console.log(`Connection error: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() payload: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) {
      client.emit('error', 'Unauthorized');
      return;
    }
    
    try {
      // Call service to persist and emit to recipient
      // We don't need to emit to sender again if they sent it via socket, 
      // but to be consistent with REST, we might.
      // Actually, Service.sendMessage emits to recipient.
      // Sender usually updates UI optimistically or via ack.
      const message = await this.chatService.sendMessage(userId, payload);
      // Ack to sender
      return { status: 'ok', data: message };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  // Helper to emit to a user room
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }
}
