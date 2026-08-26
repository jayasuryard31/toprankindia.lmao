import { useEffect, useRef } from "react";
import { IconX } from "./Icons";

export default function Modal({ isOpen, onClose, children, maxWidth = "max-w-md" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-surface/95 dark:bg-surface/95 backdrop-blur-xl border border-border/80 dark:border-border/80 rounded-2xl shadow-feather-lg w-full ${maxWidth} p-6 relative overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft dark:bg-elevated hover:bg-border/60 dark:hover:bg-elevated/80 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <IconX className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
