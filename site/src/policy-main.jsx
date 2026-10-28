import "@fontsource-variable/albert-sans";
import "@fontsource/doto/400.css";
import "./app.css";
import "./downloads.css";
import "./policy.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Policy from "./Policy.jsx";

createRoot(document.getElementById("root")).render(<StrictMode><Policy /></StrictMode>);
