import { useEffect, useRef, useState, useCallback } from "react";
import { GameController } from "../GameController";
import GameHUD from "./GameHUD";
import LandmarkPrompt from "./LandmarkPrompt";
import PlotBidPopup from "../../components/city/PlotBidPopup";
import BillboardBookingPopup from "../../components/city/BillboardBookingPopup";
import TouchControls from "./TouchControls";

const KEYMAP = {
  KeyW: "forward", ArrowUp: "forward",
  KeyS: "back", ArrowDown: "back",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
  ShiftLeft: "sprint", ShiftRight: "sprint",
  KeyC: "crouch",
};

/**
 * React host for the in-city third-person mode. Owns the GameController
 * lifecycle, keyboard/mouse capture, pointer lock and the minimal HUD.
 */
export default function GameMode({ engine, onExit, onOutbidSuccess }) {
  const ctrlRef = useRef(null);
  const playerRef = useRef(null);
  const camYawRef = useRef(0);
  const [state, setState] = useState({ phase: "cinematic", interactable: null, locate: {} });
  const [detail, setDetail] = useState(null); // landmark detail panel
  const [plot, setPlot] = useState(null); // vacant-plot bid popup
  const [booking, setBooking] = useState(null); // billboard booking form
  const [locked, setLocked] = useState(false);

  const onCtrlState = useCallback((s) => {
    playerRef.current = s.player;
    camYawRef.current = s.camYaw;
    setState(s);
  }, []);

  // Touch device? (pointer:coarse covers phones/tablets, incl. iPadOS)
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window)
  );

  const handleTouchInput = useCallback((partial) => {
    ctrlRef.current?.setInput(partial);
  }, []);
  const handleTouchLook = useCallback((dx, dy) => {
    ctrlRef.current?.addMouse(dx * 1.5, dy * 1.5);
  }, []);

  // ── lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!engine) return undefined;
    const ctrl = new GameController(engine, { onState: onCtrlState });
    ctrlRef.current = ctrl;
    let alive = true;

    ctrl.enter().then(() => {
      if (!alive) return;
      engine.setGameHook((dt) => ctrl.update(dt));
    });

    return () => {
      alive = false;
      ctrl.onState = () => {};
      engine.setGameHook(null);
      ctrl.dispose(); // synchronous teardown — safe under StrictMode double-mount
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      if (document.pointerLockElement) document.exitPointerLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // ── keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = () => ctrlRef.current;
    const down = (e) => {
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (detail || plot || booking) {
          setDetail(null);
          setPlot(null);
          setBooking(null);
        } else {
          handleExit();
        }
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        ctrl()?.setInput({ jumpPressed: true, jumpHeld: true });
        return;
      }
      if (e.code === "KeyE") {
        openInteraction();
        return;
      }
      if (e.code === "KeyO") {
        ctrl()?.triggerEmote();
        return;
      }
      if (e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        ctrl()?.setInput({ sprint: true, run: true });
        return;
      }
      const k = KEYMAP[e.code];
      if (k) {
        ctrl()?.setInput({ [k]: true, ...(e.shiftKey ? { sprint: true, run: true } : {}) });
      }
    };
    const up = (e) => {
      if (e.code === "Space") {
        ctrl()?.setInput({ jumpHeld: false });
        return;
      }
      if (e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        ctrl()?.setInput({ sprint: false, run: false });
        return;
      }
      const k = KEYMAP[e.code];
      if (k) {
        ctrl()?.setInput({ [k]: false, ...(!e.shiftKey ? { sprint: false, run: false } : {}) });
      }
    };
    const clearInput = () => {
      ctrl()?.setInput({
        forward: false,
        back: false,
        left: false,
        right: false,
        sprint: false,
        run: false,
        crouch: false,
        jumpHeld: false,
      });
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", clearInput);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", clearInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, plot, booking]);

  // ── pointer lock + mouse look ────────────────────────────────────
  useEffect(() => {
    if (!engine) return;
    if (isTouch) return undefined; // touch devices use TouchControls, not pointer lock
    const dom = engine.renderer.domElement;
    const onClick = () => {
      if (!detail && !plot && state.phase === "playing" && !document.pointerLockElement) {
        dom.requestPointerLock?.();
      }
    };
    const onLockChange = () => setLocked(document.pointerLockElement === dom);
    const onMove = (e) => {
      if (document.pointerLockElement === dom) ctrlRef.current?.addMouse(e.movementX, e.movementY);
    };
    dom.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMove);
    return () => {
      dom.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMove);
    };
  }, [engine, detail, plot, state.phase, isTouch]);

  function openInteraction() {
    const it = ctrlRef.current?.interact();
    if (!it) return;
    if (document.pointerLockElement) document.exitPointerLock();
    if (it.type === "landmark" || it.type === "billboard") {
      setDetail({ ...it, onBook: (bb) => { setDetail(null); setBooking(bb); } });
    }
    else if (it.type === "plot") setPlot(it);
  }

  async function handleExit() {
    const ctrl = ctrlRef.current;
    if (ctrl && ctrl.phase === "playing") {
      if (document.pointerLockElement) document.exitPointerLock();
      await ctrl.leave(); // cinematic lift back to the map
    }
    onExit?.();
  }

  const centerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  return (
    <div className="absolute inset-0 z-[60] pointer-events-none">
      {/* cinematic letterbox / vignette while descending */}
      {state.phase === "cinematic" && (
        <>
          <div className="absolute inset-x-0 top-0 h-[12vh] bg-black animate-in fade-in duration-500" />
          <div className="absolute inset-x-0 bottom-0 h-[12vh] bg-black animate-in fade-in duration-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/90 text-sm font-mono tracking-[0.3em] animate-pulse">
              ENTERING VELORA HARBOR…
            </span>
          </div>
        </>
      )}

      {state.phase === "playing" && (
        <>
          <GameHUD
            locate={state.locate}
            interactable={state.interactable}
            locked={locked}
            onExit={handleExit}
            engine={engine}
            playerRef={playerRef}
            camYawRef={camYawRef}
            online={state.online || 1}
            isTouch={isTouch}
          />
          {isTouch && !detail && !plot && !booking && (
            <TouchControls
              onInput={handleTouchInput}
              onLook={handleTouchLook}
              onInteract={openInteraction}
              onEmote={() => ctrlRef.current?.triggerEmote()}
              hasInteract={!!state.interactable}
            />
          )}
        </>
      )}

      {detail && (
        <LandmarkPrompt
          landmark={detail}
          anchor={state.headAnchor}
          onClose={() => setDetail(null)}
        />
      )}

      {booking && (
        <BillboardBookingPopup
          billboard={booking}
          screenPos={centerPos}
          onClose={() => setBooking(null)}
          onAcquire={(record) => {
            engine.claimBillboard?.(booking.id || booking.billboardId, record);
            onOutbidSuccess?.(record);
            setBooking(null);
          }}
        />
      )}

      {plot && (
        <PlotBidPopup
          plot={plot}
          screenPos={centerPos}
          onClose={() => setPlot(null)}
          onAcquire={(product, x, z) => {
            engine.claimPlot?.(product?.normalizedUrl || product?.websiteUrl, x, z);
            onOutbidSuccess?.(product);
            setPlot(null);
          }}
        />
      )}
    </div>
  );
}
