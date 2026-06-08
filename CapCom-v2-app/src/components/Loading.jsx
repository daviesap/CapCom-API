import useLoadingToast from "../hooks/useLoadingToast.js";

export default function Loading({ label = "Loading..." }) {
  useLoadingToast(true, label);

  return <div className="message">{label}</div>;
}
