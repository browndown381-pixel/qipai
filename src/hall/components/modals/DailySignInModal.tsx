import React, { useState } from 'react';
import { CalendarCheck, Gift, X } from 'lucide-react';

export interface DailySignInModalProps {
  onClose: () => void;
  onClaimSupply: () => void;
}

export const DailySignInModal: React.FC<DailySignInModalProps> = ({
  onClose,
  onClaimSupply,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [claimed, setClaimed] = useState<boolean>(
    () => localStorage.getItem('h5_signin_last_date') === today
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-amber-400/30 bg-[#182234] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 text-amber-400">
          <CalendarCheck className="h-6 w-6" />
          <h3 className="text-lg font-black">每日签到福利</h3>
        </div>

        <p className="mt-2 text-xs text-slate-300">
          每日登录即可免费领取欢乐豆补给，畅玩全厅棋牌。
        </p>

        <div className="my-5 grid grid-cols-4 gap-2">
          {[1000, 1500, 2000, 2500, 3000, 4000, 8888].map((beans, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 ${
                idx === 6
                  ? 'col-span-2 border-amber-400/50 bg-amber-500/15'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <span className="text-[10px] text-slate-400">第 {idx + 1} 天</span>
              <span className="mt-1 text-sm font-black text-amber-300">+{beans}</span>
            </div>
          ))}
        </div>

        <button
          disabled={claimed}
          onClick={() => {
            localStorage.setItem('h5_signin_last_date', today);
            setClaimed(true);
            onClaimSupply();
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black shadow-lg ${
            claimed
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950'
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>{claimed ? '今日已签到领取' : '立即签到领取奖励'}</span>
        </button>
      </div>
    </div>
  );
};
