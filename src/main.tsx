// Observe loading before App's imports trigger model preloads.
import "./game/loading";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { game } from "./game/simulation";
// Read-only inspection / deterministic scenario setup for local playtests. Not shipped in production.
if (import.meta.env.DEV) window.__game = game;
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
