import http from 'http';
import path from 'path';
import express from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { ConnectionManager } from './server/core/ConnectionManager.js';
import { RoomManager } from './server/core/RoomManager.js';
import { DdzRoom } from './server/games/ddz/DdzRoom.js';
import { MahjongRoom } from './server/games/mahjong/MahjongRoom.js';
import { NiuniuRoom } from './server/games/niuniu/NiuniuRoom.js';
import { ZhajinhuaRoom } from './server/games/zhajinhua/ZhajinhuaRoom.js';
import { storageService, UserProfile } from './server/shared/storage.js';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json());

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const connectionManager = new ConnectionManager(io);
  const roomManager = new RoomManager(connectionManager);

  // Register game factories in generic RoomManager
  roomManager.registerGameFactory('ddz', (opts) => new DdzRoom(opts));
  roomManager.registerGameFactory('mahjong', (opts) => new MahjongRoom(opts));
  roomManager.registerGameFactory('niuniu', (opts) => new NiuniuRoom(opts));
  roomManager.registerGameFactory('zhajinhua', (opts) => new ZhajinhuaRoom(opts));

  // Every room type exposes sendSnapshotToPlayer(); avoid instanceof chains per game.
  const sendRoomSnapshot = (room: unknown, playerId: string): void => {
    const target = room as { sendSnapshotToPlayer?: (id: string) => void } | null | undefined;
    target?.sendSnapshotToPlayer?.(playerId);
  };

  // Helper to guarantee socket has a bound player session even if an action fires immediately
  const ensurePlayerProfile = async (
    socket: Socket,
    fallbackId?: string,
    nickname?: string,
    avatarId?: string
  ): Promise<UserProfile> => {
    const existingPlayerId = connectionManager.getPlayerIdBySocket(socket.id);
    if (existingPlayerId) {
      const existingProfile = storageService.getUser(existingPlayerId);
      if (existingProfile) return existingProfile;
    }

    const authData = (socket.handshake.auth ?? {}) as Record<string, string | undefined>;
    const rawId =
      fallbackId ||
      authData.playerId ||
      `guest_${socket.id.slice(0, 8)}`;

    const profile = storageService.getOrCreateGuest(
      rawId,
      nickname || authData.nickname,
      avatarId || authData.avatarId
    );
    await connectionManager.bindSession(profile.playerId, socket);
    return profile;
  };

  // REST API endpoints for Lobby & Stats
  app.get('/api/rooms', (req, res) => {
    const gameType = typeof req.query.gameType === 'string' ? req.query.gameType : undefined;
    res.json({ rooms: roomManager.getPublicRooms(gameType) });
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json({ leaderboard: storageService.getLeaderboard(10) });
  });

  app.get('/api/matches/:playerId', (req, res) => {
    const matches = storageService.getPlayerMatches(req.params.playerId, 15);
    res.json({ matches });
  });

  app.get('/api/replay/:matchId', (req, res) => {
    const replay = storageService.getMatchReplay(req.params.matchId);
    if (!replay) {
      res.status(404).json({ error: '未找到该局复盘数据' });
      return;
    }
    res.json({ replay });
  });

  // WebSocket (Socket.io) protocol handlers
  io.on('connection', async (socket) => {
    // Auto-bind immediately from handshake auth if available
    if (socket.handshake.auth?.playerId) {
      await ensurePlayerProfile(socket);
    }

    socket.on(
      'c2s_auth_guest',
      async (payload: { playerId?: string; nickname?: string; avatarId?: string }) => {
        const profile = await ensurePlayerProfile(
          socket,
          payload?.playerId,
          payload?.nickname,
          payload?.avatarId
        );

        const activeRoom = roomManager.getRoomByPlayer(profile.playerId);
        socket.emit('s2c_auth_success', {
          profile,
          activeRoomId: activeRoom?.roomId ?? null,
          activeGameType: activeRoom?.gameType ?? null,
          rooms: roomManager.getPublicRooms(),
        });

        if (activeRoom) {
          socket.join(activeRoom.roomId);
          activeRoom.handlePlayerReconnect(profile.playerId);
        }
      }
    );

    socket.on(
      'c2s_update_profile',
      async (payload: { nickname: string; avatarId?: string }) => {
        const profile = await ensurePlayerProfile(socket);
        const updated = storageService.updateNickname(
          profile.playerId,
          payload?.nickname ?? '',
          payload?.avatarId
        );
        if (updated) {
          socket.emit('s2c_profile_updated', { profile: updated });
        }
      }
    );

    socket.on('c2s_claim_supply', async () => {
      const profile = await ensurePlayerProfile(socket);
      const updated = storageService.claimFreeSupply(profile.playerId);
      if (updated) {
        socket.emit('s2c_profile_updated', {
          profile: updated,
          notice: '已为您补充 5000 欢乐豆与 5 张房卡',
        });
      }
    });

    socket.on('c2s_get_lobby_data', async () => {
      const profile = await ensurePlayerProfile(socket);
      socket.emit('s2c_lobby_data', {
        profile,
        rooms: roomManager.getPublicRooms(),
        leaderboard: storageService.getLeaderboard(10),
        matches: storageService.getPlayerMatches(profile.playerId, 15),
      });
    });

    socket.on(
      'c2s_create_room',
      async (payload: {
        gameType?: string;
        baseScore?: number;
        isPrivate?: boolean;
        autoFillBots?: boolean;
        mode?: string;
      }) => {
        const profile = await ensurePlayerProfile(socket);

        // Deduct 1 room card from host when creating a room
        if (!storageService.consumeRoomCard(profile.playerId, 1)) {
          socket.emit('s2c_action_error', {
            message: '房卡不足（建房需消耗 1 张房卡），请先点击“免费补给”领取房卡',
          });
          return;
        }

        const allowedScores = [100, 200, 300, 500, 800, 2000, 10000];
        const baseScore = allowedScores.includes(Number(payload?.baseScore))
          ? Number(payload.baseScore)
          : 100;

        const room = roomManager.createRoom({
          gameType: payload?.gameType || 'ddz',
          hostPlayer: {
            playerId: profile.playerId,
            nickname: profile.nickname,
            avatarId: profile.avatarId,
            beans: profile.beans,
          },
          baseScore,
          isPrivate: Boolean(payload?.isPrivate),
          mode: payload?.mode || 'classic',
        });

        socket.emit('s2c_profile_updated', { profile: storageService.getUser(profile.playerId) });
        socket.emit('s2c_room_joined', { roomId: room.roomId, gameType: room.gameType });

        if (payload?.autoFillBots) {
          while (room.getPlayerCount() < room.maxPlayers) {
            room.addBotPlayer();
          }
        }

        sendRoomSnapshot(room, profile.playerId);
        io.emit('s2c_rooms_updated', { rooms: roomManager.getPublicRooms() });
      }
    );

    socket.on('c2s_join_room', async (payload: { roomId: string }) => {
      const profile = await ensurePlayerProfile(socket);

      const cleanRoomId = String(payload?.roomId ?? '').trim();
      const res = roomManager.joinRoom(cleanRoomId, {
        playerId: profile.playerId,
        nickname: profile.nickname,
        avatarId: profile.avatarId,
        beans: profile.beans,
      });

      if (!res.ok || !res.room) {
        socket.emit('s2c_action_error', { message: res.error ?? '加入房间失败' });
        return;
      }

      socket.emit('s2c_room_joined', { roomId: res.room.roomId, gameType: res.room.gameType });
      sendRoomSnapshot(res.room, profile.playerId);
      io.emit('s2c_rooms_updated', { rooms: roomManager.getPublicRooms() });
    });

    socket.on(
      'c2s_quick_match',
      async (payload: { gameType?: string; baseScore?: number; fillBots?: boolean; mode?: string }) => {
        const profile = await ensurePlayerProfile(socket);

        const allowedScores = [100, 200, 300, 500, 800, 2000, 10000];
        const baseScore = allowedScores.includes(Number(payload?.baseScore))
          ? Number(payload.baseScore)
          : 100;
        const fillBots = payload?.fillBots !== undefined ? Boolean(payload.fillBots) : true;
        const gameType = payload?.gameType || 'ddz';

        const room = roomManager.quickMatch(
          gameType,
          {
            playerId: profile.playerId,
            nickname: profile.nickname,
            avatarId: profile.avatarId,
            beans: profile.beans,
          },
          baseScore,
          fillBots,
          payload?.mode || (gameType === 'mahjong' ? 'puer' : gameType === 'niuniu' ? 'qiangzhuang' : 'classic')
        );

        socket.emit('s2c_room_joined', { roomId: room.roomId, gameType: room.gameType });
        sendRoomSnapshot(room, profile.playerId);
        io.emit('s2c_rooms_updated', { rooms: roomManager.getPublicRooms() });
      }
    );

    socket.on('c2s_request_snapshot', async () => {
      const profile = await ensurePlayerProfile(socket);
      const room = roomManager.getRoomByPlayer(profile.playerId);
      sendRoomSnapshot(room, profile.playerId);
    });

    socket.on('c2s_add_bot', async () => {
      const profile = await ensurePlayerProfile(socket);
      const room = roomManager.getRoomByPlayer(profile.playerId);
      if (!room) return;

      room.addBotPlayer();
      sendRoomSnapshot(room, profile.playerId);
      io.emit('s2c_rooms_updated', { rooms: roomManager.getPublicRooms() });
    });

    socket.on('c2s_toggle_ready', async (payload?: { ready?: boolean }) => {
      const profile = await ensurePlayerProfile(socket);
      const room = roomManager.getRoomByPlayer(profile.playerId);
      if (!room) return;

      room.setPlayerReady(profile.playerId, payload?.ready ?? true);
    });

    socket.on('c2s_leave_room', async () => {
      const profile = await ensurePlayerProfile(socket);
      roomManager.leaveRoom(profile.playerId);
      const updatedProfile = storageService.getUser(profile.playerId);
      socket.emit('s2c_left_room', {
        profile: updatedProfile,
        rooms: roomManager.getPublicRooms(),
      });
      io.emit('s2c_rooms_updated', { rooms: roomManager.getPublicRooms() });
    });

    // Forward game-specific events to room
    const gameEvents = [
      'c2s_call_landlord',
      'c2s_grab_landlord',
      'c2s_double_score',
      'c2s_play_cards',
      'c2s_request_hint',
      'c2s_toggle_trusteeship',
      'c2s_send_chat',
      'c2s_throw_prop',
      // Mahjong events
      'c2s_mj_dingque',
      'c2s_mj_swap_three',
      'c2s_mj_discard',
      'c2s_mj_respond',
      'c2s_mj_self_action',
      'c2s_mj_action',
      // Niuniu events
      'c2s_niuniu_call_banker',
      'c2s_niuniu_bet',
      'c2s_niuniu_show_hand',
      'c2s_niuniu_ready',
      // Zhajinhua events
      'c2s_zjh_action',
      'c2s_zjh_ready',
    ];

    for (const evt of gameEvents) {
      socket.on(evt, async (payload: unknown) => {
        const profile = await ensurePlayerProfile(socket);
        const room = roomManager.getRoomByPlayer(profile.playerId);
        if (!room) return;
        room.handleClientEvent(profile.playerId, evt, payload);
      });
    }

    socket.on('disconnect', () => {
      connectionManager.handleDisconnect(
        socket.id,
        (playerId) => {
          const room = roomManager.getRoomByPlayer(playerId);
          if (room) {
            room.handlePlayerDisconnect(playerId);
          }
        },
        (playerId) => {
          roomManager.leaveRoom(playerId);
          io.emit('s2c_rooms_updated', { rooms: roomManager.getPublicRooms() });
        }
      );
    });
  });

  // Mount Vite dev server in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
