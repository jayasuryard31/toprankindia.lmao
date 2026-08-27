import { useEffect, useRef, useState } from "react";

/**
 * Mobile gameplay input:
 *  - left thumb  : virtual stick (analog direction + magnitude → walk/run)
 *  - right thumb : drag anywhere on the right half to look around
 *  - buttons     : jump / sprint / crouch / interact
 *
 * Emits the same shape the keyboard path uses, so the controller is agnostic.
 */
const STICK_R = 58; // px, outer radius
const KNOB_R = 26;

export default function TouchControls({ onInput, onLook, onInteract, onEmote, hasInteract }) {
  const stickRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const stickId = useRef(null);
  const lookId = useRef(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const sprintRef = useRef(false);
  const [sprintOn, setSprintOn] = useState(false);
  const [crouchOn, setCrouchOn] = useState(false);

  // ── virtual stick ────────────────────────────────────────────────
  useEffect(() => {
    const el = stickRef.current;
    if (!el) return undefined;

    const origin = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const apply = (dx, dy) => {
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, STICK_R);
      const nx = len > 0 ? (dx / len) * clamped : 0;
      const ny = len > 0 ? (dy / len) * clamped : 0;
      setKnob({ x: nx, y: ny, active: true });

      const mag = clamped / STICK_R;
      const dead = 0.16;
      if (mag < dead) {
        onInput({ forward: false, back: false, left: false, right: false, run: false, sprint: false });
        return;
      }
      // Analog: push past 65% (or hold sprint) to run.
      const run = mag > 0.65 || sprintRef.current;
      const ax = nx / STICK_R;
      const ay = ny / STICK_R;
      onInput({
        forward: ay < -0.35,
        back: ay > 0.35,
        left: ax < -0.35,
        right: ax > 0.35,
        run,
        sprint: sprintRef.current && mag > 0.5,
      });
    };

    const onStart = (e) => {
      if (stickId.current !== null) return;
      const t = e.changedTouches[0];
      stickId.current = t.identifier;
      const o = origin();
      apply(t.clientX - o.x, t.clientY - o.y);
    };
    const onMove = (e) => {
      if (stickId.current === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId.current) continue;
        const o = origin();
        apply(t.clientX - o.x, t.clientY - o.y);
      }
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId.current) continue;
        stickId.current = null;
        setKnob({ x: 0, y: 0, active: false });
        onInput({ forward: false, back: false, left: false, right: false, run: false, sprint: false });
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onInput]);

  // ── look drag (right half of the screen) ─────────────────────────
  useEffect(() => {
    const onStart = (e) => {
      if (lookId.current !== null) return;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.42) continue; // left half = stick
        if (t.target.closest?.("[data-game-btn]")) continue;
        lookId.current = t.identifier;
        lookLast.current = { x: t.clientX, y: t.clientY };
        break;
      }
    };
    const onMove = (e) => {
      if (lookId.current === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId.current) continue;
        onLook(t.clientX - lookLast.current.x, t.clientY - lookLast.current.y);
        lookLast.current = { x: t.clientX, y: t.clientY };
      }
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookId.current) lookId.current = null;
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onLook]);

  const Btn = ({ label, sub, onDown, onUp, active, accent, big }) => (
    <button
      data-game-btn
      onTouchStart={(e) => {
        e.preventDefault();
        onDown?.();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp?.();
      }}
      className={`select-none touch-none rounded-full flex flex-col items-center justify-center
                  border backdrop-blur-md font-bold transition-colors
                  ${big ? "w-16 h-16 text-[11px]" : "w-13 h-13 text-[10px]"}
                  ${
                    active
                      ? "bg-coral/85 border-coral text-white"
                      : accent
                        ? "bg-coral/80 border-coral/60 text-white"
                        : "bg-black/40 border-white/20 text-white/85"
                  }`}
      style={big ? undefined : { width: 52, height: 52 }}
    >
      <span>{label}</span>
      {sub && <span className="text-[8px] font-normal opacity-70">{sub}</span>}
    </button>
  );

  return (
    <>
      {/* left: movement stick */}
      <div
        ref={stickRef}
        className="absolute left-5 bottom-6 z-50 touch-none select-none pointer-events-auto"
        style={{ width: STICK_R * 2, height: STICK_R * 2 }}
      >
        <div className="absolute inset-0 rounded-full bg-black/25 backdrop-blur-md border border-white/15" />
        <div
          className={`absolute rounded-full border transition-colors ${
            knob.active ? "bg-white/80 border-white" : "bg-white/45 border-white/60"
          }`}
          style={{
            width: KNOB_R * 2,
            height: KNOB_R * 2,
            left: STICK_R - KNOB_R + knob.x,
            top: STICK_R - KNOB_R + knob.y,
          }}
        />
      </div>

      {/* right: action buttons */}
      <div className="absolute right-5 bottom-6 z-50 flex flex-col items-end gap-2.5 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          {onEmote && (
            <Btn label="O" sub="emote" onDown={onEmote} />
          )}
          {hasInteract && (
            <Btn label="E" sub="use" accent big onDown={onInteract} />
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Btn
            label="C"
            sub="crouch"
            active={crouchOn}
            onDown={() => {
              const v = !crouchOn;
              setCrouchOn(v);
              onInput({ crouch: v });
            }}
          />
          <Btn
            label="RUN"
            active={sprintOn}
            onDown={() => {
              const v = !sprintOn;
              sprintRef.current = v;
              setSprintOn(v);
              onInput({ sprint: v, run: v });
            }}
          />
          <Btn
            label="JUMP"
            big
            accent
            onDown={() => onInput({ jumpPressed: true, jumpHeld: true })}
            onUp={() => onInput({ jumpHeld: false })}
          />
        </div>
      </div>
    </>
  );
}
