"use client";

export default function ChatArea() {
  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 flex flex-col h-[160px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-bold">대화</span>
        <span className="text-gray-400 text-[10px] bg-gray-700/50 px-2 py-0.5 rounded-full">
          준비 중
        </span>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto mb-2">
        <p className="text-gray-500 text-xs text-center mt-8">
          채팅 기능이 곧 추가됩니다
        </p>
      </div>

      {/* 입력창 (비활성) */}
      <div className="flex gap-2">
        <input
          type="text"
          disabled
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-white/10 text-gray-500 text-sm rounded-lg px-3 py-1.5 outline-none cursor-not-allowed"
        />
        <button
          disabled
          className="bg-gray-600 text-gray-400 text-sm px-3 py-1.5 rounded-lg cursor-not-allowed"
        >
          전송
        </button>
      </div>
    </div>
  );
}
