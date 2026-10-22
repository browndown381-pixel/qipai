import { MahjongTableSnapshot } from '../types';
import {
  legacyIdToTileIndex,
  getTileSuit,
  TILE_SHORT_NAMES_34,
} from '../algorithms/TileEngine';

export interface PosterPlayerStat {
  seatId: number;
  nickname: string;
  isDealer: boolean;
  scoreDelta: number;
  finalBeans: number;
  huCount: number;
  gangCount: number;
  tiles: number[];
  isWinner: boolean;
  rank: number;
}

export function generateSharePoster(snapshot: MahjongTableSnapshot): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const width = 1200;
      const height = 675;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // 1. Outer Dark Mahogany Lacquer Frame
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#2b1007');
      bgGrad.addColorStop(0.5, '#1e0c05');
      bgGrad.addColorStop(1, '#140602');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold Filigree Outer Rim
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      ctx.strokeStyle = '#8c6d23';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // 2. Main Parchment Sheet Inset
      const parchmentX = 24;
      const parchmentY = 24;
      const parchmentW = width - 48;
      const parchmentH = height - 48;
      const parchmentRadius = 14;

      drawRoundedRect(ctx, parchmentX, parchmentY, parchmentW, parchmentH, parchmentRadius);
      const paperGrad = ctx.createLinearGradient(parchmentX, parchmentY, parchmentX, parchmentY + parchmentH);
      paperGrad.addColorStop(0, '#faf4e8');
      paperGrad.addColorStop(0.5, '#f5ebd7');
      paperGrad.addColorStop(1, '#ebdac0');
      ctx.fillStyle = paperGrad;
      ctx.fill();

      // Parchment Inner Border
      ctx.strokeStyle = '#bfa16a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Corner Key Ornaments
      drawCornerBrackets(ctx, parchmentX + 8, parchmentY + 8, parchmentW - 16, parchmentH - 16, 24);

      // 3. Top Header Plaque
      const plaqueX = width / 2 - 280;
      const plaqueY = 36;
      const plaqueW = 560;
      const plaqueH = 68;

      drawRoundedRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 12);
      const plaqueGrad = ctx.createLinearGradient(plaqueX, plaqueY, plaqueX, plaqueY + plaqueH);
      plaqueGrad.addColorStop(0, '#991b1b');
      plaqueGrad.addColorStop(0.5, '#7f1d1d');
      plaqueGrad.addColorStop(1, '#581111');
      ctx.fillStyle = plaqueGrad;
      ctx.fill();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Plaque Title Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillText('四川红中血流成河 · 终局战报', width / 2, plaqueY + 34);
      ctx.shadowColor = 'transparent';

      // Meta Information Bar
      const nowStr = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const roomIdStr = `房间号: ${snapshot.roomId || '888888'}`;
      const baseScoreStr = `底分: ${snapshot.baseScore || 100} 豆`;
      const roundStr = `局数: ${snapshot.roundIndex || 1}/${snapshot.maxRounds || 4}`;

      ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#78350f';
      ctx.textAlign = 'center';
      ctx.fillText(`${roomIdStr}    |    ${baseScoreStr}    |    ${roundStr}    |    ${nowStr}`, width / 2, 122);

      // 4. Gather & Sort Player Records
      const deltas = snapshot.settlement?.scoreDeltas || [0, 0, 0, 0];
      const revealHands = snapshot.settlement?.revealHands || [[], [], [], []];
      const maxDelta = Math.max(...deltas);

      // Count Hu & Gangs from bills
      const huCounts = [0, 0, 0, 0];
      const gangCounts = [0, 0, 0, 0];
      (snapshot.bills || []).forEach((b) => {
        if (b.winnerSeatId !== undefined && b.winnerSeatId >= 0 && b.winnerSeatId < 4) {
          if (b.eventType === 'zimo' || b.eventType === 'dianpao' || b.eventType === 'qianggang') {
            huCounts[b.winnerSeatId]++;
          } else if (b.eventType === 'guafeng' || b.eventType === 'xiayu') {
            gangCounts[b.winnerSeatId]++;
          }
        }
      });

      const playerStats: PosterPlayerStat[] = snapshot.players.map((p, sId) => {
        const delta = deltas[sId] ?? 0;
        const hand = (revealHands[sId] && revealHands[sId].length > 0)
          ? revealHands[sId]
          : (p.handTiles || []);

        return {
          seatId: sId,
          nickname: p.nickname || `玩家 ${sId + 1}`,
          isDealer: sId === snapshot.dealerSeatId,
          scoreDelta: delta,
          finalBeans: p.beans,
          huCount: huCounts[sId],
          gangCount: gangCounts[sId],
          tiles: hand,
          isWinner: delta > 0 && delta === maxDelta,
          rank: 1,
        };
      });

      // Sort by scoreDelta descending
      playerStats.sort((a, b) => b.scoreDelta - a.scoreDelta);
      playerStats.forEach((p, idx) => {
        p.rank = idx + 1;
      });

      // 5. Draw 4 Player Record Rows
      const rowStartY = 142;
      const rowHeight = 100;
      const rowGap = 10;
      const rowX = 46;
      const rowWidth = width - 92;

      playerStats.forEach((p, idx) => {
        const rowY = rowStartY + idx * (rowHeight + rowGap);
        drawPlayerRow(ctx, p, rowX, rowY, rowWidth, rowHeight);
      });

      // 6. Bottom Brand and Security Signature Bar
      const footerY = 595;
      ctx.strokeStyle = '#d6c0a0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rowX, footerY);
      ctx.lineTo(rowX + rowWidth, footerY);
      ctx.stroke();

      ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#8c6d48';
      ctx.textAlign = 'left';
      ctx.fillText('正宗四川红中血流 · 随时随地组局对战', rowX + 10, footerY + 22);

      ctx.textAlign = 'right';
      ctx.fillText('防作弊系统认证 · 绿色竞技健康娱乐', rowX + rowWidth - 10, footerY + 22);

      // Return Data URL
      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      reject(err);
    }
  });
}

function drawPlayerRow(
  ctx: CanvasRenderingContext2D,
  p: PosterPlayerStat,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Row Background
  drawRoundedRect(ctx, x, y, w, h, 10);
  if (p.isWinner) {
    const winGrad = ctx.createLinearGradient(x, y, x + w, y);
    winGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
    winGrad.addColorStop(1, 'rgba(253, 230, 138, 0.35)');
    ctx.fillStyle = winGrad;
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();
    ctx.strokeStyle = '#d1c0a5';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Rank Badge (Left)
  const rankColors = ['#eab308', '#94a3b8', '#b45309', '#78716c'];
  const rankBg = rankColors[p.rank - 1] || '#78716c';
  const badgeRadius = 15;
  const badgeCenterX = x + 28;
  const badgeCenterY = y + h / 2;

  ctx.beginPath();
  ctx.arc(badgeCenterX, badgeCenterY, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = rankBg;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px "PingFang SC", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(p.rank), badgeCenterX, badgeCenterY);

  // Player Name & Dealer Badge
  const nameX = x + 55;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 17px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#1c1917';
  const truncatedName = p.nickname.length > 8 ? p.nickname.slice(0, 8) + '...' : p.nickname;
  ctx.fillText(truncatedName, nameX, y + 18);

  if (p.isDealer) {
    const textWidth = ctx.measureText(truncatedName).width;
    const dealerX = nameX + textWidth + 8;
    const dealerY = y + 17;
    drawRoundedRect(ctx, dealerX, dealerY, 22, 20, 4);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.font = 'bold 12px "PingFang SC", sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('庄', dealerX + 11, dealerY + 10);
  }

  // Hu & Gang stats
  ctx.font = '13px "PingFang SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#991b1b';
  ctx.fillText(`胡牌 ${p.huCount}次`, nameX, y + 46);
  ctx.fillStyle = '#b45309';
  ctx.fillText(`开杠 ${p.gangCount}次`, nameX + 75, y + 46);

  // Reveal / Hand Tiles (Middle)
  const tilesStartX = x + 245;
  const tileY = y + 26;
  const tileW = 26;
  const tileH = 38;
  const tileGap = 3;

  const displayTiles = p.tiles.slice(0, 14);
  displayTiles.forEach((tileId, tIdx) => {
    drawMiniMahjongTile(ctx, tileId, tilesStartX + tIdx * (tileW + tileGap), tileY, tileW, tileH);
  });

  // Score Delta & Beans (Right)
  const rightX = x + w - 24;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  if (p.scoreDelta > 0) {
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", monospace';
    ctx.fillStyle = '#b91c1c';
    ctx.fillText(`+${p.scoreDelta.toLocaleString()}`, rightX, y + 22);
  } else if (p.scoreDelta < 0) {
    ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", monospace';
    ctx.fillStyle = '#059669';
    ctx.fillText(p.scoreDelta.toLocaleString(), rightX, y + 22);
  } else {
    ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", monospace';
    ctx.fillStyle = '#57534e';
    ctx.fillText('0', rightX, y + 22);
  }

  ctx.font = '13px "PingFang SC", sans-serif';
  ctx.fillStyle = '#78716c';
  ctx.fillText(`${p.finalBeans.toLocaleString()} 豆`, rightX, y + 54);

  // Winner Stamp Seal
  if (p.isWinner) {
    drawWinnerSeal(ctx, x + w - 195, y + 14);
  }
}

function drawMiniMahjongTile(
  ctx: CanvasRenderingContext2D,
  tileId: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Tile Body: Ivory 2.5D rounded rect
  drawRoundedRect(ctx, x, y, w, h, 4);
  const tileGrad = ctx.createLinearGradient(x, y, x, y + h);
  tileGrad.addColorStop(0, '#ffffff');
  tileGrad.addColorStop(0.7, '#fbf8ef');
  tileGrad.addColorStop(1, '#e5dcc7');
  ctx.fillStyle = tileGrad;
  ctx.fill();

  ctx.strokeStyle = '#a89a81';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bottom 3D bevel edge
  ctx.fillStyle = '#059669'; // Green back edge
  ctx.fillRect(x + 1, y + h - 3, w - 2, 2);

  // Tile Character / Glyph
  const idx = legacyIdToTileIndex(tileId);
  const label = TILE_SHORT_NAMES_34[idx] || '';
  const suit = getTileSuit(idx);

  let color = '#dc2626';
  if (suit === 1 || idx === 32) {
    color = '#15803d'; // 条 / 发
  } else if (suit === 2 || idx === 33) {
    color = '#0369a1'; // 筒 / 白
  } else if (suit === 3) {
    color = '#b45309'; // 东南西北风
  } else {
    color = '#dc2626'; // 万 / 中
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(label, x + w / 2, y + (h - 3) / 2);
}

function drawWinnerSeal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x + 28, y + 28);
  ctx.rotate((-12 * Math.PI) / 180);

  // Double circle in vermilion stamp red
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();

  // Seal Text
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('大赢家', 0, 0);

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number,
) {
  ctx.strokeStyle = '#bfa16a';
  ctx.lineWidth = 2;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
}
