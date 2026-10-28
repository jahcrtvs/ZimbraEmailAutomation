import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/doto/400.css";
import "./styles/tokens/colors.css";
import "./styles/tokens/typography.css";
import "./styles/tokens/spacing.css";
import "./styles/tokens/base.css";
import "./app.css";
import { App } from "./App.jsx";
import { ErrorBoundary, reportError } from "./screens/CrashScreen.jsx";

window.addEventListener("error", e => reportError("window", e.error || e.message));
window.addEventListener("unhandledrejection", e => reportError("window (promise)", e.reason));

createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);