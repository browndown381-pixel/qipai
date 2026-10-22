import { io, Socket } from 'socket.io-client';

type EventHandler<T = any> = (payload: T) => void;

/**
 * Generic WebSocket Client wrapper (/src/shared/network/SocketClient.ts).
 * Strictly game-agnostic: contains no game-specific business logic.
 */
export class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private playerId: string;

  constructor() {
    const savedId = localStorage.getItem('h5_game_player_id');
    if (savedId) {
      this.playerId = savedId;
    } else {
      this.playerId = `guest_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('h5_game_player_id', this.playerId);
    }
  }

  getPlayerId(): string {
    return this.playerId;
  }

  connect(): void {
    if (this.socket) return;

    const savedNickname = localStorage.getItem('h5_game_nickname') || undefined;
    const savedAvatar = localStorage.getItem('h5_game_avatar') || undefined;

    this.socket = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 800,
      auth: {
        playerId: this.playerId,
        nickname: savedNickname,
        avatarId: savedAvatar,
      },
    });

    this.socket.on('connect', () => {
      const latestNick = localStorage.getItem('h5_game_nickname') || undefined;
      const latestAvatar = localStorage.getItem('h5_game_avatar') || undefined;
      this.emit('c2s_auth_guest', {
        playerId: this.playerId,
        nickname: latestNick,
        avatarId: latestAvatar,
      });
      this.dispatchLocal('socket_connected', { connected: true });
    });

    this.socket.on('disconnect', () => {
      this.dispatchLocal('socket_disconnected', { connected: false });
    });

    this.socket.onAny((event: string, payload: unknown) => {
      this.dispatchLocal(event, payload);
    });
  }

  emit(event: string, payload?: unknown): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit(event, payload);
  }

  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private dispatchLocal(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      fn(payload);
    }
  }
}

export const socketClient = new SocketClient();
