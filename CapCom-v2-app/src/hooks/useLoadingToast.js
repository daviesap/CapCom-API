import { useEffect, useRef } from "react";
import { useToast } from "../components/ToastProvider.jsx";

export default function useLoadingToast(isLoading, label = "Loading...") {
  const { dismissToast, showToast } = useToast();
  const toastIdRef = useRef("");

  useEffect(() => {
    if (!isLoading) {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = "";
      }
      return undefined;
    }

    toastIdRef.current = showToast(label, {
      id: `loading-${label}`,
      persist: true,
      variant: "loading",
    });

    return () => {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = "";
      }
    };
  }, [dismissToast, isLoading, label, showToast]);
}
