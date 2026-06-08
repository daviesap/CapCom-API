import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const defaultDurations = {
    error: 8000,
    warning: 5000,
    info: 3500,
    success: 3500,
    loading: 3500,
  };

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.map((toast) =>
      toast.id === toastId ? { ...toast, exiting: true } : toast
    ));

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 300);
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return "";

    const toastId = options.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const variant = options.variant || "info";
    const nextToast = {
      id: toastId,
      message,
      variant,
      exiting: false,
    };

    setToasts((current) => {
      const duplicateActiveToast = !options.id && current.some((toast) =>
        !toast.exiting && toast.message === message && toast.variant === variant
      );

    if (duplicateActiveToast) {
      return current;
    }

    return [
      nextToast,
      ...current.filter((toast) => toast.id !== toastId),
    ].slice(0, 4);
  });

    if (!options.persist) {
      window.setTimeout(() => {
        dismissToast(toastId);
      }, options.duration || defaultDurations[variant] || 3500);
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
          <div 
            className={`toast toast-${toast.variant}${toast.exiting ? " exiting" : ""}`} 
            role="status" 
            key={toast.id}
          >
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
