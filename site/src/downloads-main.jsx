import "@fontsource-variable/albert-sans";
import "./app.css";
import "./downloads.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Downloads from "./Downloads.jsx";

createRoot(document.getElementById("root")).render(<StrictMode><Downloads /></StrictMode>);
