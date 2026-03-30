import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "error", dur),
    info: (msg, dur) => addToast(msg, "info", dur),
    warn: (msg, dur) => addToast(msg, "warning", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const typeStyles = {
  success: "bg-emerald-50 border-emerald-400 text-emerald-800",
  error: "bg-red-50 border-red-400 text-red-800",
  info: "bg-blue-50 border-blue-400 text-blue-800",
  warning: "bg-amber-50 border-amber-400 text-amber-800",
};

const iconMap = {
  success: "\u2713",
  error: "\u2715",
  info: "\u2139",
  warning: "\u26A0",
};

const ToastContainer = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`
          pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg
          max-w-sm cursor-pointer transition-all duration-300
          ${typeStyles[t.type] || typeStyles.info}
        `}
        style={{ animation: "toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        onClick={() => onRemove(t.id)}
      >
        <span className="font-bold">{iconMap[t.type]}</span>
        <span className="text-sm font-medium flex-1">{t.message}</span>
        <button className="text-lg opacity-60 hover:opacity-100 ml-1">\u00D7</button>
      </div>
    ))}
  </div>
);
