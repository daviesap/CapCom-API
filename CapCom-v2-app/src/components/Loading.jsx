import useLoadingToast from "../hooks/useLoadingToast.js";

export default function Loading({
  label = "Loading...",
  withToast = false,
  id,
  showAfterMs = 0,
  persist = true,
}) {
  useLoadingToast(withToast, label, {
    id,
    persist,
    showAfterMs,
    variant: "loading",
  });

  return null;
}
