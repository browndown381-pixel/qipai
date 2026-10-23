import { Server, Socket } from 'socket.io';
import { redisClient } from './redisClient.js';
import { securityGateway } from './SecurityGateway.js';

/**
 * ConnectionManager: Manages player socket sessions, heartbeats, and disconnect tolerance.
 * Strictly game-agnostic (/server/core boundary).
 */
export class ConnectionManager {
  private io: Server;
  private playerToSocket: Map<string, string> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  async bindSession(playerId: string, socket: Socket): Promise<void> {
    const existingTimer = this.disconnectTimers.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(playerId);
    }

    const oldSocketId = this.playerToSocket.get(playerId);
    if (oldSocketId && oldSocketId !== socket.id) {
      this.socketToPlayer.delete(oldSocketId);
      securityGateway.removeSocketState(oldSocketId);
    }

    this.playerToSocket.set(playerId, socket.id);
    this.socketToPlayer.set(socket.id, playerId);
    await redisClient.hset('online_players', playerId, JSON.stringify({
      socketId: socket.id,
      disconnected: false,
      updatedAt: Date.now(),
    }));
  }

  async touchHeartbeat(playerId: string, socket: Socket): Promise<void> {
    const existingTimer = this.disconnectTimers.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(playerId);
    }
    this.playerToSocket.set(playerId, socket.id);
    this.socketToPlayer.set(socket.id, playerId);
    await redisClient.hset('online_players', playerId, JSON.stringify({
      socketId: socket.id,
      disconnected: false,
      updatedAt: Date.now(),
    }));
  }

  getPlayerIdBySocket(socketId: string): string | undefined {
    return this.socketToPlayer.get(socketId);
  }

  getSocketByPlayerId(playerId: string): Socket | undefined {
    const socketId = this.playerToSocket.get(playerId);
    if (!socketId) return undefined;
    return this.io.sockets.sockets.get(socketId);
  }

  getOnlinePlayerCount(): number {
    return this.playerToSocket.size;
  }

  getPendingReconnectCount(): number {
    return this.disconnectTimers.size;
  }

  emitToPlayer(playerId: string, event: string, payload: unknown): void {
    const socket = this.getSocketByPlayerId(playerId);
    if (socket) {
      socket.emit(event, payload);
    }
  }

  async handleDisconnect(
    socketId: string,
    onImmediateDisconnect: (playerId: string) => void,
    onGracePeriodExpired: (playerId: string) => void,
    gracePeriodMs = 75000
  ): Promise<void> {
    securityGateway.removeSocketState(socketId);

    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return;

    this.socketToPlayer.delete(socketId);
    this.playerToSocket.delete(playerId);

    await redisClient.hset('online_players', playerId, JSON.stringify({
      socketId: null,
      disconnected: true,
      updatedAt: Date.now(),
    }));

    onImmediateDisconnect(playerId);

    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(playerId);
      await redisClient.hdel('online_players', playerId);
      onGracePeriodExpired(playerId);
    }, gracePeriodMs);

    this.disconnectTimers.set(playerId, timer);
  }
}
