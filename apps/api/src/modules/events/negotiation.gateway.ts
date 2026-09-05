import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
    credentials: true,
  },
  namespace: 'negotiation',
})
export class NegotiationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NegotiationGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to negotiation gateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from negotiation gateway: ${client.id}`);
  }

  @SubscribeMessage('join_deal_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { quoteId: string; user: { name: string; role: string } },
  ) {
    const room = `quote-${payload.quoteId}`;
    client.join(room);
    this.logger.log(`User ${payload.user?.name} (${payload.user?.role}) joined room ${room}`);
    client.to(room).emit('user_joined', {
      user: payload.user,
      joinedAt: new Date().toISOString(),
    });
    return { status: 'joined', room };
  }

  @SubscribeMessage('quote_line_changed')
  handleLineChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { quoteId: string; lineId: string; discountPct: number; quantity: number },
  ) {
    const room = `quote-${payload.quoteId}`;
    this.logger.log(`Line ${payload.lineId} changed in room ${room}`);
    client.to(room).emit('quote_line_updated', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('counter_offer_received')
  handleCounterOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { quoteId: string; counterDiscountPct: number; proposedBy: string },
  ) {
    const room = `quote-${payload.quoteId}`;
    this.logger.log(`Counter offer received for quote ${payload.quoteId}: ${payload.counterDiscountPct}%`);
    client.to(room).emit('counter_offer_broadcast', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper method for external services to broadcast updates
  broadcastQuoteUpdate(quoteId: string, eventName: string, data: any) {
    if (this.server) {
      this.server.to(`quote-${quoteId}`).emit(eventName, data);
    }
  }
}
