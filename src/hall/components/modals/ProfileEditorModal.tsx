import React, { useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import { AVATAR_OPTIONS, AvatarSvg } from '../../../shared/ui/AvatarSvg';

export interface ProfileEditorModalProps {
  initialNickname: string;
  initialAvatarId: string;
  onClose: () => void;
  onSave: (nickname: string, avatarId: string) => void;
}

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  initialNickname,
  initialAvatarId,
  onClose,
  onSave,
}) => {
  const [nickname, setNickname] = useState(initialNickname);
  const [avatarId, setAvatarId] = useState(initialAvatarId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#162032] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-400">
          <UserCheck className="h-6 w-6" />
          <h3 className="text-lg font-black">个人形象设置</h3>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">玩家昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">选择头像</label>
            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAvatarId(opt.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                    avatarId === opt.id
                      ? 'border-amber-400 bg-amber-500/20 scale-105'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="h-11 w-11 overflow-hidden rounded-full">
                    <AvatarSvg avatarId={opt.id} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (nickname.trim()) {
                onSave(nickname.trim(), avatarId);
                onClose();
              }
            }}
            className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-black text-slate-950 shadow-lg"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};
