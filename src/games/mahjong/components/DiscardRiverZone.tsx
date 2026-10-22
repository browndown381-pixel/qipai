import React from 'react';
import { MahjongTileView } from './MahjongTileView';

export interface DiscardRiverZoneProps {
  discards: number[][]; // [seat0, seat1, seat2, seat3] (relative seats: 0=me, 1=right, 2=top, 3=left)
  latestDiscard?: { seatId: number; tileId?: number; card?: number } | null;
  centerY?: number; // Center Y of the compass in virtual 720p space (defaults to 310)
}

// Split discard list into strict rows/columns of 6 tiles each (Standard 6-Tile Mahjong River)
function chunkList<T>(arr: T[], size = 6): T[][] {
  if (!arr || arr.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const DiscardRiverZone: React.FC<DiscardRiverZoneProps> = ({
  discards,
  latestDiscard,
  centerY = 310,
}) => {
  const seat0Rows = chunkList(discards[0] || [], 6); // South (Me) - rows below compass
  const seat1Cols = chunkList(discards[1] || [], 6); // East (Right) - cols right of compass
  const seat2Rows = chunkList(discards[2] || [], 6); // North (Top) - rows above compass
  const seat3Cols = chunkList(discards[3] || [], 6); // West (Left) - cols left of compass

  const latestCardId = latestDiscard ? (latestDiscard.tileId ?? latestDiscard.card ?? -1) : -1;

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* ===================================================================
          1. NORTH PLAYER (Seat 2, Top) DISCARDS - STRICT 6 TILES/ROW (Above Compass)
         =================================================================== */}
      <div
        className="absolute left-1/2 z-10 flex flex-col items-center"
        style={{
          top: `${centerY - 88}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="flex flex-col-reverse items-center gap-0.5">
          {seat2Rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-0.5 justify-center">
              {row.map((t, colIdx) => {
                const globalIdx = rowIdx * 6 + colIdx;
                const isLatest =
                  latestDiscard?.seatId === 2 &&
                  latestCardId === t &&
                  globalIdx === (discards[2]?.length || 0) - 1;
                return (
                  <div key={globalIdx} className="relative">
                    <MahjongTileView tileId={t} isSmall perspective={2} kind="ming" />
                    {isLatest && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40 pointer-events-none">
                        <img
                          src="/assets/mahjong/ui/img_sign.png"
                          alt="最新出牌"
                          className="h-5 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================
          2. SOUTH PLAYER (Seat 0, Self) DISCARDS - STRICT 6 TILES/ROW (Below Compass)
         =================================================================== */}
      <div
        className="absolute left-1/2 z-10 flex flex-col items-center"
        style={{
          top: `${centerY + 88}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="flex flex-col items-center gap-0.5">
          {seat0Rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-0.5 justify-center">
              {row.map((t, colIdx) => {
                const globalIdx = rowIdx * 6 + colIdx;
                const isLatest =
                  latestDiscard?.seatId === 0 &&
                  latestCardId === t &&
                  globalIdx === (discards[0]?.length || 0) - 1;
                return (
                  <div key={globalIdx} className="relative">
                    <MahjongTileView tileId={t} isSmall perspective={2} kind="ming" />
                    {isLatest && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40 pointer-events-none">
                        <img
                          src="/assets/mahjong/ui/img_sign.png"
                          alt="最新出牌"
                          className="h-5 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================
          3. WEST PLAYER (Seat 3, Left) DISCARDS - STRICT 6 TILES/COL (Left of Compass)
         =================================================================== */}
      <div
        className="absolute z-10 flex items-center"
        style={{
          top: `${centerY}px`,
          right: 'calc(50% + 94px)',
          transform: 'translateY(-50%)',
        }}
      >
        <div className="flex flex-row-reverse items-center gap-0.5">
          {seat3Cols.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-0.5 items-center">
              {col.map((t, rowIdx) => {
                const globalIdx = colIdx * 6 + rowIdx;
                const isLatest =
                  latestDiscard?.seatId === 3 &&
                  latestCardId === t &&
                  globalIdx === (discards[3]?.length || 0) - 1;
                return (
                  <div key={globalIdx} className="relative">
                    <MahjongTileView tileId={t} isSmall perspective={1} kind="ming" />
                    {isLatest && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40 pointer-events-none">
                        <img
                          src="/assets/mahjong/ui/img_sign.png"
                          alt="最新出牌"
                          className="h-5 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================
          4. EAST PLAYER (Seat 1, Right) DISCARDS - STRICT 6 TILES/COL (Right of Compass)
         =================================================================== */}
      <div
        className="absolute z-10 flex items-center"
        style={{
          top: `${centerY}px`,
          left: 'calc(50% + 94px)',
          transform: 'translateY(-50%)',
        }}
      >
        <div className="flex flex-row items-center gap-0.5">
          {seat1Cols.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-0.5 items-center">
              {col.map((t, rowIdx) => {
                const globalIdx = colIdx * 6 + rowIdx;
                const isLatest =
                  latestDiscard?.seatId === 1 &&
                  latestCardId === t &&
                  globalIdx === (discards[1]?.length || 0) - 1;
                return (
                  <div key={globalIdx} className="relative">
                    <MahjongTileView tileId={t} isSmall perspective={3} kind="ming" />
                    {isLatest && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40 pointer-events-none">
                        <img
                          src="/assets/mahjong/ui/img_sign.png"
                          alt="最新出牌"
                          className="h-5 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
