import { createContext, useCallback, useContext, useMemo } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const dismissToast = useCallback(() => {}, []);
  const showToast = useCallback(() => "", []);

  const value = useMemo(() => ({
    dismissToast,
    showToast,
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
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
