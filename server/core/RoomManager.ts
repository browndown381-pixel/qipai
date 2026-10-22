import { Socket } from 'socket.io';
import { ConnectionManager } from './ConnectionManager.js';
import { redisClient } from './redisClient.js';

/**
 * Generic Room & Player Abstractions.
 * Strictly game-agnostic (/server/core boundary).
 */
export interface RoomPlayerInfo {
  playerId: string;
  nickname: string;
  avatarId: string;
  seatIndex: number;
  beans: number;
  ready: boolean;
  isBot: boolean;
  disconnected: boolean;
  trusteeship: boolean;
}

export interface RoomSummary {
  roomId: string;
  gameType: string;
  mode?: string;
  hostId: string;
  baseScore: number;
  isPrivate: boolean;
  status: string;
  playerCount: number;
  maxPlayers: number;
  players: Array<{ nickname: string; avatarId: string; isBot: boolean }>;
}

export interface IGameRoom {
  roomId: string;
  gameType: string;
  mode?: string;
  hostId: string;
  baseScore: number;
  isPrivate: boolean;
  status: string;
  maxPlayers: number;
  createdAt: number;

  addPlayer(player: { playerId: string; nickname: string; avatarId: string; beans: number; isBot?: boolean }): boolean;
  removePlayer(playerId: string): boolean;
  hasPlayer(playerId: string): boolean;
  getPlayerCount(): number;
  isEmptyOfHumans(): boolean;
  setPlayerReady(playerId: string, ready?: boolean): void;
  addBotPlayer(): boolean;
  handlePlayerDisconnect(playerId: string): void;
  handlePlayerReconnect(playerId: string): void;
  handleClientEvent(playerId: string, event: string, payload: unknown): void;
  getSummary(): RoomSummary;
  destroy(): void;
}

export type RoomFactory = (options: {
  roomId: string;
  hostId: string;
  baseScore: number;
  isPrivate: boolean;
  mode?: string;
  connectionManager: ConnectionManager;
  onRoomDestroyed: (roomId: string) => void;
}) => IGameRoom;

export class RoomManager {
  private rooms: Map<string, IGameRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private factories: Map<string, RoomFactory> = new Map();
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  registerGameFactory(gameType: string, factory: RoomFactory): void {
    this.factories.set(gameType, factory);
  }

  generateRoomId(): string {
    for (let i = 0; i < 100; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    return Date.now().toString().slice(-6);
  }

  createRoom(options: {
    gameType: string;
    hostPlayer: { playerId: string; nickname: string; avatarId: string; beans: number };
    baseScore: number;
    isPrivate: boolean;
    mode?: string;
  }): IGameRoom {
    const existingRoom = this.getRoomByPlayer(options.hostPlayer.playerId);
    if (existingRoom) {
      this.leaveRoom(options.hostPlayer.playerId);
    }

    const factory = this.factories.get(options.gameType);
    if (!factory) {
      throw new Error(`Unsupported gameType: ${options.gameType}`);
    }

    const roomId = this.generateRoomId();
    const room = factory({
      roomId,
      hostId: options.hostPlayer.playerId,
      baseScore: options.baseScore,
      isPrivate: options.isPrivate,
      mode: options.mode,
      connectionManager: this.connectionManager,
      onRoomDestroyed: (id) => {
        this.rooms.delete(id);
        redisClient.del(`room:${id}`);
      },
    });

    this.rooms.set(roomId, room);
    room.addPlayer(options.hostPlayer);
    this.playerToRoom.set(options.hostPlayer.playerId, roomId);
    this.bindSocketRoom(options.hostPlayer.playerId, roomId);
    return room;
  }

  joinRoom(
    roomId: string,
    player: { playerId: string; nickname: string; avatarId: string; beans: number }
  ): { ok: boolean; error?: string; room?: IGameRoom } {
    const currentRoom = this.getRoomByPlayer(player.playerId);
    if (currentRoom && currentRoom.roomId !== roomId) {
      this.leaveRoom(player.playerId);
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { ok: false, error: '房间号不存在或已解散' };
    }

    if (room.hasPlayer(player.playerId)) {
      this.playerToRoom.set(player.playerId, roomId);
      this.bindSocketRoom(player.playerId, roomId);
      room.handlePlayerReconnect(player.playerId);
      return { ok: true, room };
    }

    if (room.getPlayerCount() >= room.maxPlayers) {
      return { ok: false, error: '该房间人数已满（3/3）' };
    }

    if (room.status !== 'WAITING') {
      return { ok: false, error: '该房间对局已开始，无法中途加入' };
    }

    const added = room.addPlayer(player);
    if (!added) {
      return { ok: false, error: '无法加入该房间' };
    }

    this.playerToRoom.set(player.playerId, roomId);
    this.bindSocketRoom(player.playerId, roomId);
    return { ok: true, room };
  }

  quickMatch(
    gameType: string,
    player: { playerId: string; nickname: string; avatarId: string; beans: number },
    baseScore = 100,
    fillBotsImmediately = true,
    mode?: string
  ): IGameRoom {
    const existing = this.getRoomByPlayer(player.playerId);
    if (existing) {
      this.leaveRoom(player.playerId);
    }

    // Find an open public room waiting for players with matching mode & baseScore
    for (const room of this.rooms.values()) {
      if (
        room.gameType === gameType &&
        !room.isPrivate &&
        room.baseScore === baseScore &&
        (!mode || !room.mode || room.mode === mode) &&
        room.status === 'WAITING' &&
        room.getPlayerCount() < room.maxPlayers
      ) {
        const res = this.joinRoom(room.roomId, player);
        if (res.ok && res.room) {
          if (fillBotsImmediately) {
            while (res.room.getPlayerCount() < res.room.maxPlayers) {
              res.room.addBotPlayer();
            }
          }
          return res.room;
        }
      }
    }

    // Otherwise create a new public room
    const newRoom = this.createRoom({
      gameType,
      hostPlayer: player,
      baseScore,
      isPrivate: false,
      mode,
    });

    if (fillBotsImmediately) {
      while (newRoom.getPlayerCount() < newRoom.maxPlayers) {
        newRoom.addBotPlayer();
      }
    }

    return newRoom;
  }

  leaveRoom(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    this.playerToRoom.delete(playerId);
    this.unbindSocketRoom(playerId, roomId);

    if (!room) return;
    room.removePlayer(playerId);

    if (room.isEmptyOfHumans()) {
      room.destroy();
      this.rooms.delete(roomId);
      redisClient.del(`room:${roomId}`);
    }
  }

  getRoomByPlayer(playerId: string): IGameRoom | undefined {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return undefined;
    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return undefined;
    }
    return room;
  }

  getPublicRooms(gameType?: string): RoomSummary[] {
    const list: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!gameType || room.gameType === gameType) {
        list.push(room.getSummary());
      }
    }
    return list.sort((a, b) => b.playerCount - a.playerCount);
  }

  private bindSocketRoom(playerId: string, roomId: string): void {
    const socket: Socket | undefined = this.connectionManager.getSocketByPlayerId(playerId);
    if (socket) {
      socket.join(roomId);
    }
  }

  private unbindSocketRoom(playerId: string, roomId: string): void {
    const socket: Socket | undefined = this.connectionManager.getSocketByPlayerId(playerId);
    if (socket) {
      socket.leave(roomId);
    }
  }
}
