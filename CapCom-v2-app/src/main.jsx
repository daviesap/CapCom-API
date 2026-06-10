import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

const shouldUseServiceWorker = import.meta.env.PROD;

if (shouldUseServiceWorker && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Temporary retirement bridge: keep registration long enough for installed
    // PWAs to receive /sw.js, clear old app-shell caches, and unregister.
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}

if (!shouldUseServiceWorker && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const hadActiveServiceWorker = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.getRegistrations().then((registrations) => (
      Promise.all(registrations.map((registration) => registration.unregister()))
    )).then(() => {
      if (hadActiveServiceWorker && !sessionStorage.getItem("capcom-v2-dev-sw-cleared")) {
        sessionStorage.setItem("capcom-v2-dev-sw-cleared", "true");
        window.location.reload();
      }
    });

    if ("caches" in window) {
      caches.keys().then((cacheNames) => {
        cacheNames
          .filter((cacheName) => cacheName.startsWith("capcom-v2-app-shell-"))
          .forEach((cacheName) => caches.delete(cacheName));
      });
    }
  });
}

const shouldPreventAppShellZoom = () =>
  window.matchMedia("(max-width: 767px)").matches && document.querySelector(".app-shell");

window.addEventListener(
  "gesturestart",
  (event) => {
    if (shouldPreventAppShellZoom()) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener(
  "gesturechange",
  (event) => {
    if (shouldPreventAppShellZoom()) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1 && shouldPreventAppShellZoom()) {
      event.preventDefault();
    }
  },
  { passive: false }
);
