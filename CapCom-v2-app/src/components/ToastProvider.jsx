import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return "";

    const toastId = options.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextToast = {
      id: toastId,
      message,
      variant: options.variant || "info",
    };

    setToasts((current) => [
      nextToast,
      ...current.filter((toast) => toast.id !== toastId),
    ].slice(0, 4));

    if (!options.persist) {
      window.setTimeout(() => {
        dismissToast(toastId);
      }, options.duration || 3500);
    }

    return toastId;
  }, [dismissToast]);

  const value = useMemo(() => ({
    dismissToast,
    showToast,
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.variant}`} role="status" key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toastContext = useContext(ToastContext);
  if (!toastContext) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return toastContext;
}
