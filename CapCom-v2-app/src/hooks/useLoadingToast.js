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
  } = options;
  const toastIdRef = useRef("");
  const pendingToastRef = useRef(null);

  useEffect(() => {
    const resolvedId = id || `loading-${label}`;
    const clearPendingToast = () => {
      if (pendingToastRef.current) {
        window.clearTimeout(pendingToastRef.current);
        pendingToastRef.current = null;
      }
    };

    const showLoadingToast = () => {
      if (toastIdRef.current && toastIdRef.current !== resolvedId) {
        dismissToast(toastIdRef.current);
      }

      toastIdRef.current = showToast(label, {
        id: resolvedId,
        persist,
        variant,
      });
    };

    if (!isLoading) {
      clearPendingToast();
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = "";
      }
      return undefined;
    }

    clearPendingToast();

    const delay = Math.max(0, Number(showAfterMs) || 0);
    if (delay === 0) {
      showLoadingToast();
      return () => {
        if (toastIdRef.current) {
          dismissToast(toastIdRef.current);
          toastIdRef.current = "";
        }
      };
    }

    pendingToastRef.current = window.setTimeout(() => {
      showLoadingToast();
      pendingToastRef.current = null;
    }, delay);

    return () => {
      clearPendingToast();
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = "";
      }
    };

  }, [dismissToast, id, isLoading, label, persist, showAfterMs, showToast, variant]);
}
