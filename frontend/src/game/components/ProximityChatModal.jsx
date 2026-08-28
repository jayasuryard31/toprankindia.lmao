import { useState, useEffect, useRef } from "react";
import { IconX, IconArrowUpRight } from "../../components/common/Icons";

/**
 * Temporary In-World Proximity Chat Panel
 * - Pinned to the 3D in-world character in screen space with leader line.
 * - Works strictly when two players come close to each other.
 * - Direct peer messaging over the existing WebSocket connection.
 * - NOT saved to any database (ephemeral session).
 */
export default function ProximityChatModal({
  targetPlayer,
  messages = [],
  onSendMessage,
  onClose,
  anchor,
}) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSendMessage?.(clean);
    setText("");
  };

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;
  const CARD_W = 340;
  const ax = anchor?.x ?? vw / 2;
  const ay = anchor?.y ?? vh / 2;
  const toRight = ax < vw / 2;
  let left = toRight ? ax + 34 : ax - 34 - CARD_W;
  left = Math.min(Math.max(12, left), vw - CARD_W - 12);
  const top = Math.min(Math.max(70, ay - 140), Math.max(70, vh - 380));

  const playerColor = targetPlayer?.color
    ? `#${targetPlayer.color.toString(16).padStart(6, "0")}`
    : "#38bdf8";

  return (
    <>
      {/* Click-away catcher - transparent, keeps the world visible */}
      <div className="absolute inset-0 z-40 pointer-events-auto" onClick={onClose} />

      {/* In-world leader line from the character's head to the card */}
      {anchor?.visible && (
        <svg className="absolute inset-0 z-40 pointer-events-none" width="100%" height="100%">
          <line
            x1={ax}
            y1={ay}
            x2={toRight ? left : left + CARD_W}
            y2={top + 36}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          <circle cx={ax} cy={ay} r="3" fill="#38bdf8" />
        </svg>
      )}

      <div
        style={{ left: `${left}px`, top: `${top}px` }}
        onClick={(e) => e.stopPropagation()}
        className="absolute z-50 w-84 sm:w-88 max-w-[calc(100vw-24px)] glass-panel p-4 rounded-3xl shadow-2xl border border-sky-400/60 text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-auto flex flex-col backdrop-blur-xl bg-slate-950/85"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
              style={{ backgroundColor: playerColor, boxShadow: `0 0 8px ${playerColor}` }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-xs truncate">
                  {targetPlayer?.name || "Nearby Player"}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {targetPlayer?.distance ? `${targetPlayer.distance.toFixed(1)}m` : "Proximity"}
                </span>
              </div>
              <div className="text-[10px] text-white/50 truncate">
                Temporary Session · Not Saved
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer flex-shrink-0"
            title="Close (Esc)"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Stream */}
        <div
          ref={scrollRef}
          className="h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/20 text-[11px]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/40 px-4">
              <span className="text-xl mb-1">💬</span>
              <span>You are near each other! Say hello or start a live conversation.</span>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.isMe;
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-[9px] text-white/40 mb-0.5 px-1">
                    {isMe ? "You" : m.senderName || targetPlayer?.name || "Player"}
                  </span>
                  <div
                    className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words leading-relaxed ${
                      isMe
                        ? "bg-coral text-white rounded-br-xs shadow-md"
                        : "bg-slate-800/90 text-white rounded-bl-xs border border-white/10"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type temporary message..."
            maxLength={280}
            className="flex-1 bg-black/40 border border-white/20 focus:border-sky-400 focus:outline-none rounded-xl px-3 py-2 text-white placeholder-white/40 text-xs transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Send"
          >
            <IconArrowUpRight className="w-4 h-4 rotate-45" />
          </button>
        </form>
      </div>
    </>
  );
}

