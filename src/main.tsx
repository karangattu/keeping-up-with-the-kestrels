import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// In the Android app every asset is packaged in the APK, so there is nothing
// left to cache offline and a service worker would only add a stale-cache layer.
const supportsServiceWorker = "serviceWorker" in navigator && !Capacitor.isNativePlatform();

if (import.meta.env.PROD && supportsServiceWorker) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => {
      // The game remains playable online if service worker registration fails.
    });
  });
} else if (import.meta.env.DEV && supportsServiceWorker) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}
