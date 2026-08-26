import { createContext, useContext, useState, useCallback } from "react";
import { IconCheck, IconX, IconSparkle } from "../components/common/Icons";

const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl glass-panel shadow-feather-lg border text-xs font-semibold animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.type === "success"
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : t.type === "error"
                ? "border-rose-500/30 text-rose-700 dark:text-rose-300"
                : "border-border text-charcoal dark:text-white"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                t.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : t.type === "error"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-coral/10 text-coral"
              }`}
            >
              {t.type === "success" ? (
                <IconCheck className="w-3.5 h-3.5" />
              ) : t.type === "error" ? (
                <IconX className="w-3.5 h-3.5" />
              ) : (
                <IconSparkle className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="flex-1 leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
