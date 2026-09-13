// Observe loading before App's imports trigger model preloads.
import "./game/loading";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { game } from "./game/simulation";
// Inspection and scenario setup are exposed only in development or explicit debug mode.
if (import.meta.env.DEV || game.debug.enabled) window.__game = game;
import "./styles.css";
import "./components/GameMenus.css";
import "./components/AdventureTheme.css";
import "./components/RelicTypography.css";
import "./components/MobileMinimalHud.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
