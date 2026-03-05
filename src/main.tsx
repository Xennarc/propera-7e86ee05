import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerPWA } from "./lib/pwa-registration";
import { installSmokeHelpers } from "./lib/dev-smoke-helpers";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Register PWA service worker after render
registerPWA();

// Install dev-only smoke helpers on window.__propera_smoke
installSmokeHelpers();
