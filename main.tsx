import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CockpitApp } from "./app/CockpitApp";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CockpitApp />
  </StrictMode>,
);
