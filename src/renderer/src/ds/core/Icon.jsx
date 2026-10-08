import React from "react";
import * as L from "lucide-react";

const toPascal = n => String(n).split(/[-_ ]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");

export function Icon({ name, size = 18, strokeWidth = 1.75, color = "currentColor", style }) {
  const C = L[toPascal(name)];
  if (!C) return null;
  return <C width={size} height={size} strokeWidth={strokeWidth} color={color} aria-hidden="true" style={{ flexShrink: 0, ...style }} />;
}