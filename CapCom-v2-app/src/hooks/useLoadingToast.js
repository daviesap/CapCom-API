import { useEffect, useRef } from "react";
import { useToast } from "../components/ToastProvider.jsx";

export default function useLoadingToast(
  isLoading,
  label = "Loading...",
  options = {}
) {
  const { dismissToast, showToast } = useToast();
  const {
    variant = "loading",
    id,
    persist = true,
    showAfterMs = 0,
    minVisibleMs = 0,
  } = options;
  const toastIdRef = useRef("");
  const pendingToastRef = useRef(null);
  const dismissToastTimeoutRef = useRef(null);
  const shownAtRef = useRef(0);

  useEffect(() => {
    const resolvedId = id || `loading-${label}`;
    const clearPendingToast = () => {
      if (pendingToastRef.current) {
        window.clearTimeout(pendingToastRef.current);
        pendingToastRef.current = null;
      }
    };

    const clearDismissToast = () => {
      if (dismissToastTimeoutRef.current) {
        window.clearTimeout(dismissToastTimeoutRef.current);
        dismissToastTimeoutRef.current = null;
      }
    };

    const scheduleDismiss = () => {
      clearDismissToast();
      const minVisible = Math.max(0, Number(minVisibleMs) || 0);
      if (minVisible === 0) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = "";
        return;
      }

      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, minVisible - elapsed);
      dismissToastTimeoutRef.current = window.setTimeout(() => {
        dismissToast(toastIdRef.current);
        toastIdRef.current = "";
        dismissToastTimeoutRef.current = null;
      }, remaining);
    };

    const showLoadingToast = () => {
      if (toastIdRef.current && toastIdRef.current !== resolvedId) {
        dismissToast(toastIdRef.current);
      }
      shownAtRef.current = Date.now();
      clearDismissToast();

      toastIdRef.current = showToast(label, {
        id: resolvedId,
        persist,
        variant,
      });
    };

    if (!isLoading) {
      clearPendingToast();
      clearDismissToast();
      if (toastIdRef.current) {
        scheduleDismiss();
      }
      return undefined;
    }

    clearPendingToast();

    const delay = Math.max(0, Number(showAfterMs) || 0);
    if (delay === 0) {
      showLoadingToast();
      return () => {
        clearPendingToast();
        clearDismissToast();
        if (toastIdRef.current) {
          scheduleDismiss();
        }
      };
    }

    pendingToastRef.current = window.setTimeout(() => {
      showLoadingToast();
      pendingToastRef.current = null;
    }, delay);

    return () => {
      clearPendingToast();
      clearDismissToast();
      if (toastIdRef.current) {
        scheduleDismiss();
      }
    };

  }, [dismissToast, id, isLoading, label, minVisibleMs, persist, showAfterMs, showToast, variant]);
}
