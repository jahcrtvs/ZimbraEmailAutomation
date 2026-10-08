/* @ds-bundle: {"format":4,"namespace":"ZimbraDigestDesignSystem_9514e4","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Kbd","sourcePath":"components/core/Kbd.jsx"},{"name":"Tooltip","sourcePath":"components/core/Tooltip.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"Tag","sourcePath":"components/data/Tag.jsx"},{"name":"Banner","sourcePath":"components/feedback/Banner.jsx"},{"name":"ConfirmDialog","sourcePath":"components/feedback/ConfirmDialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"DatePicker","sourcePath":"components/forms/DatePicker.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"RadioCard","sourcePath":"components/forms/RadioCard.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"TimePicker","sourcePath":"components/forms/TimePicker.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"NotchCard","sourcePath":"components/layout/NotchCard.jsx"},{"name":"AppSidebar","sourcePath":"components/navigation/AppSidebar.jsx"},{"name":"ConnectionStatus","sourcePath":"components/navigation/ConnectionStatus.jsx"}],"sourceHashes":{"components/core/Button.jsx":"e2991724885d","components/core/Icon.jsx":"c89a0e687aca","components/core/IconButton.jsx":"7ae7d69dba09","components/core/Kbd.jsx":"868bfce81b8f","components/core/Tooltip.jsx":"66f64e2667f6","components/data/Badge.jsx":"a4fab9f8d6a4","components/data/StatusBadge.jsx":"f69bed9689a0","components/data/Tag.jsx":"f6bf29a3ad85","components/feedback/Banner.jsx":"87edf51f7da7","components/feedback/ConfirmDialog.jsx":"7bcee5b1bab5","components/feedback/EmptyState.jsx":"f1f2aba905ce","components/feedback/Modal.jsx":"b1b29d7efb20","components/feedback/Toast.jsx":"ed81f9562ccb","components/forms/Checkbox.jsx":"3d8d478bc1b3","components/forms/DatePicker.jsx":"66a586faae2b","components/forms/Field.jsx":"ede4f800dc81","components/forms/Input.jsx":"8b3f650f4ca2","components/forms/RadioCard.jsx":"fb2d3207f2d1","components/forms/Select.jsx":"eb23470b6959","components/forms/Switch.jsx":"18de5ac1e9d8","components/forms/Textarea.jsx":"8df14caf9c9a","components/forms/TimePicker.jsx":"9f99b0d7fe7a","components/layout/Card.jsx":"2d8f69ef8586","components/layout/NotchCard.jsx":"b57c969258e4","components/navigation/AppSidebar.jsx":"4d2c49b6b5df","components/navigation/ConnectionStatus.jsx":"8ed0b44a2154","ui_kits/daily-digest-assistant/Dialogs.jsx":"16d86a150876","ui_kits/daily-digest-assistant/HomeScreen.jsx":"6562ab07d70d","ui_kits/daily-digest-assistant/ListScreens.jsx":"88213002e265","ui_kits/daily-digest-assistant/NewDigestScreen.jsx":"dd3185ff78da","ui_kits/daily-digest-assistant/SettingsScreen.jsx":"5f776fc55c3b","ui_kits/daily-digest-assistant/Shell.jsx":"a288d09c0b29","ui_kits/daily-digest-assistant/TemplatesScreen.jsx":"c59b4514cd04","ui_kits/daily-digest-assistant/data.js":"42f97d30bb88"},"inlinedExternals":[],"unexposedExports":[{"name":"fieldBox","sourcePath":"components/forms/Field.jsx"},{"name":"formatDate","sourcePath":"components/forms/DatePicker.jsx"}]} */

(() => {

const __ds_ns = (window.ZimbraDigestDesignSystem_9514e4 = window.ZimbraDigestDesignSystem_9514e4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
function toPascal(n) {
  return String(n).split(/[-_ ]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}
function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  color = "currentColor",
  style
}) {
  const lib = typeof window !== "undefined" && window.lucide;
  let node = lib && lib.icons && (lib.icons[toPascal(name)] || lib.icons[name]);
  if (node && !Array.isArray(node[0]) && Array.isArray(node[2])) node = node[2];
  const kids = Array.isArray(node) ? node.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })) : null;
  return React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: "block",
      ...style
    },
    "aria-hidden": true
  }, kids);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function IconButton({
  icon,
  variant = "ghost",
  size = 32,
  dot,
  label,
  onClick,
  active,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const v = {
    ghost: {
      bg: hover ? "rgba(255,255,255,.07)" : "transparent",
      fg: hover ? "var(--fg-1)" : "var(--fg-2)",
      bd: "transparent"
    },
    outline: {
      bg: hover ? "rgba(255,255,255,.07)" : "transparent",
      fg: "var(--fg-1)",
      bd: "var(--border-default)"
    },
    filled: {
      bg: hover ? "var(--ink-5)" : "var(--ink-4)",
      fg: "var(--fg-1)",
      bd: "transparent"
    },
    inverse: {
      bg: "var(--surface-inverse)",
      fg: "var(--fg-on-inverse)",
      bd: "transparent"
    }
  }[active ? "inverse" : variant];
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label || icon,
    title: label,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: "relative",
      width: size,
      height: size,
      borderRadius: "50%",
      border: `1px solid ${v.bd}`,
      background: v.bg,
      color: v.fg,
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      padding: 0,
      transition: "background var(--dur-fast)",
      flexShrink: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * .5)
  }), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: size * .18,
      right: size * .18,
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: dot === true ? "var(--orange-500)" : dot
    }
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Kbd.jsx
try { (() => {
function Kbd({
  children,
  tone = "default"
}) {
  const light = tone === "onLight";
  return /*#__PURE__*/React.createElement("kbd", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      height: 18,
      padding: "0 5px",
      borderRadius: 5,
      font: "500 11px/1 var(--font-sans)",
      background: light ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.08)",
      color: light ? "inherit" : "var(--fg-3)",
      border: light ? "0" : "1px solid var(--border-subtle)",
      opacity: light ? .75 : 1
    }
  }, children);
}
Object.assign(__ds_scope, { Kbd });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Kbd.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const sizes = {
  sm: {
    h: 28,
    px: 12,
    fs: 12,
    ic: 14
  },
  md: {
    h: 36,
    px: 14,
    fs: 13,
    ic: 16
  },
  lg: {
    h: 40,
    px: 18,
    fs: 14,
    ic: 16
  }
};
const variants = {
  primary: {
    bg: "var(--surface-accent)",
    fg: "var(--fg-on-accent)",
    bd: "transparent",
    hbg: "var(--orange-400)",
    abg: "var(--orange-600)"
  },
  inverse: {
    bg: "var(--surface-inverse)",
    fg: "var(--fg-on-inverse)",
    bd: "transparent",
    hbg: "var(--paper-1)",
    abg: "var(--paper-2)"
  },
  secondary: {
    bg: "var(--ink-4)",
    fg: "var(--fg-1)",
    bd: "var(--border-subtle)",
    hbg: "var(--ink-5)",
    abg: "var(--ink-6)"
  },
  outline: {
    bg: "transparent",
    fg: "var(--fg-1)",
    bd: "var(--border-default)",
    hbg: "rgba(255,255,255,.06)",
    abg: "rgba(255,255,255,.1)"
  },
  ghost: {
    bg: "transparent",
    fg: "var(--fg-2)",
    bd: "transparent",
    hbg: "rgba(255,255,255,.06)",
    abg: "rgba(255,255,255,.1)"
  },
  danger: {
    bg: "transparent",
    fg: "var(--status-danger)",
    bd: "rgba(240,74,62,.4)",
    hbg: "var(--tint-danger)",
    abg: "rgba(240,74,62,.22)"
  }
};
function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading,
  disabled,
  kbd,
  full,
  type = "button",
  children,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.secondary;
  const off = disabled || loading;
  const bg = off ? v.bg : down ? v.abg : hover ? v.hbg : v.bg;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: off,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setDown(false);
    },
    onMouseDown: () => setDown(true),
    onMouseUp: () => setDown(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: s.h,
      padding: `0 ${s.px}px`,
      width: full ? "100%" : undefined,
      borderRadius: "var(--radius-pill)",
      border: `1px solid ${v.bd}`,
      background: bg,
      color: v.fg,
      font: `500 ${s.fs}px/1 var(--font-sans)`,
      cursor: disabled ? "not-allowed" : loading ? "progress" : "pointer",
      opacity: disabled ? .4 : 1,
      transform: down && !off ? "scale(.97)" : "none",
      transition: "background var(--dur-fast), transform var(--dur-fast)",
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      ...style
    }
  }, loading ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      animation: "dd-spin .8s linear infinite"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    size: s.ic
  })) : icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.ic
  }), children, iconRight && !loading && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.ic
  }), kbd && /*#__PURE__*/React.createElement(__ds_scope.Kbd, {
    tone: variant === "primary" || variant === "inverse" ? "onLight" : "default"
  }, kbd));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  kbd,
  side = "top",
  children
}) {
  const [open, setOpen] = React.useState(false);
  const pos = side === "bottom" ? {
    top: "calc(100% + 6px)"
  } : side === "right" ? {
    left: "calc(100% + 8px)",
    top: "50%",
    transform: "translateY(-50%)"
  } : {
    bottom: "calc(100% + 6px)"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, children, open && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...(side === "right" ? {} : {
        left: "50%",
        transform: "translateX(-50%)"
      }),
      ...pos,
      zIndex: 50,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 8px",
      borderRadius: "var(--radius-sm)",
      background: "var(--ink-5)",
      color: "var(--fg-1)",
      font: "500 12px/1 var(--font-sans)",
      whiteSpace: "nowrap",
      boxShadow: "var(--shadow-pop)",
      pointerEvents: "none"
    }
  }, label, kbd && /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, kbd)));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
function Badge({
  children,
  tone = "neutral",
  style
}) {
  const m = {
    accent: ["var(--tint-accent)", "var(--orange-500)"],
    neutral: ["var(--tint-neutral)", "var(--fg-2)"],
    success: ["var(--tint-success)", "var(--status-success)"],
    danger: ["var(--tint-danger)", "var(--status-danger)"],
    info: ["var(--tint-info)", "var(--status-info)"]
  }[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 18,
      height: 18,
      padding: "0 6px",
      boxSizing: "border-box",
      borderRadius: "var(--radius-pill)",
      background: m[0],
      color: m[1],
      font: "600 11px/1 var(--font-sans)",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusBadge.jsx
try { (() => {
const M = {
  none: {
    l: "Not started",
    c: "var(--fg-3)",
    b: "var(--tint-neutral)",
    dot: "hollow"
  },
  draft: {
    l: "Draft",
    c: "var(--fg-2)",
    b: "var(--tint-neutral)"
  },
  generating: {
    l: "Generating",
    c: "var(--status-info)",
    b: "var(--tint-info)",
    pulse: true
  },
  ready: {
    l: "Ready for Review",
    c: "var(--orange-500)",
    b: "var(--tint-accent)"
  },
  scheduled: {
    l: "Scheduled",
    c: "var(--status-info)",
    b: "var(--tint-info)",
    icon: "clock"
  },
  sending: {
    l: "Sending",
    c: "var(--status-info)",
    b: "var(--tint-info)",
    pulse: true
  },
  sent: {
    l: "Sent",
    c: "var(--status-success)",
    b: "var(--tint-success)",
    icon: "check"
  },
  failed: {
    l: "Failed",
    c: "var(--status-danger)",
    b: "var(--tint-danger)",
    icon: "circle-alert"
  },
  cancelled: {
    l: "Cancelled",
    c: "var(--fg-3)",
    b: "var(--tint-neutral)",
    icon: "ban"
  },
  missed: {
    l: "Missed",
    c: "var(--status-warning)",
    b: "var(--tint-warning)",
    icon: "triangle-alert"
  }
};
function StatusBadge({
  status = "draft",
  label,
  detail,
  size = "md"
}) {
  const m = M[status] || M.draft;
  const h = size === "sm" ? 20 : 24;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: h,
      padding: "0 9px 0 8px",
      borderRadius: "var(--radius-pill)",
      background: m.b,
      color: m.c,
      font: `500 ${size === "sm" ? 11 : 12}px/1 var(--font-sans)`,
      whiteSpace: "nowrap"
    }
  }, m.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m.icon,
    size: 12,
    strokeWidth: 2.25
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: m.dot === "hollow" ? "transparent" : m.c,
      border: m.dot === "hollow" ? `1.5px solid ${m.c}` : "0",
      animation: m.pulse ? "dd-pulse 1.2s ease-in-out infinite" : "none"
    }
  }), label || m.l, detail && /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .8
    }
  }, "\xB7 ", detail));
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/Tag.jsx
try { (() => {
function Tag({
  children,
  mono,
  tone = "neutral",
  onClick,
  style
}) {
  const accent = tone === "accent";
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      height: 22,
      padding: "0 8px",
      borderRadius: "var(--radius-xs)",
      background: accent ? "var(--tint-accent)" : "var(--ink-4)",
      color: accent ? "var(--orange-400)" : "var(--fg-2)",
      font: mono ? "500 12px/1 var(--font-mono)" : "500 12px/1 var(--font-sans)",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Banner.jsx
try { (() => {
function Banner({
  tone = "warning",
  title,
  children,
  actions,
  details
}) {
  const [open, setOpen] = React.useState(false);
  const m = {
    warning: ["triangle-alert", "var(--status-warning)", "var(--tint-warning)", "rgba(245,211,67,.3)"],
    danger: ["circle-alert", "var(--status-danger)", "var(--tint-danger)", "rgba(240,74,62,.3)"],
    info: ["info", "var(--status-info)", "var(--tint-info)", "rgba(45,140,255,.3)"],
    success: ["circle-check", "var(--status-success)", "var(--tint-success)", "rgba(126,217,87,.3)"]
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    role: "alert",
    style: {
      display: "flex",
      gap: 12,
      padding: "14px 16px",
      borderRadius: "var(--radius-md)",
      background: m[2],
      border: `1px solid ${m[3]}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: m[1],
      paddingTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m[0],
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 14px/1.35 var(--font-sans)",
      color: "var(--fg-1)"
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body)",
      color: "var(--fg-2)",
      marginTop: 4,
      textWrap: "pretty"
    }
  }, children), details && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(!open),
    style: {
      border: 0,
      padding: 0,
      background: "transparent",
      color: "var(--fg-3)",
      font: "500 12px/1 var(--font-sans)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, "View details", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: open ? "chevron-up" : "chevron-down",
    size: 12
  })), open && /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: "8px 0 0",
      padding: 10,
      borderRadius: "var(--radius-sm)",
      background: "var(--ink-1)",
      color: "var(--fg-3)",
      font: "400 11px/1.5 var(--font-mono)",
      whiteSpace: "pre-wrap"
    }
  }, details)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 12,
      flexWrap: "wrap"
    }
  }, actions)));
}
Object.assign(__ds_scope, { Banner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Banner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon = "inbox",
  title,
  children,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 8,
      padding: "40px 24px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      border: "1px dashed var(--border-strong)",
      display: "grid",
      placeItems: "center",
      color: "var(--fg-3)",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 15px/1.3 var(--font-sans)",
      color: "var(--fg-1)"
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body)",
      color: "var(--fg-3)",
      maxWidth: 300,
      textWrap: "pretty"
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  open = true,
  title,
  description,
  onClose,
  width = 440,
  footer,
  children,
  fixed
}) {
  React.useEffect(() => {
    if (!open || !onClose) return;
    const h = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: fixed ? "fixed" : "absolute",
      inset: 0,
      zIndex: 100,
      background: "var(--overlay-scrim)",
      display: "grid",
      placeItems: "center",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    style: {
      width,
      maxWidth: "100%",
      borderRadius: "var(--radius-xl)",
      background: "var(--ink-3)",
      boxShadow: "var(--shadow-pop)",
      animation: "dd-pop var(--dur-base) var(--ease-out)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "20px 20px 0 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 16px/1.3 var(--font-sans)",
      color: "var(--fg-1)"
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body)",
      color: "var(--fg-2)",
      marginTop: 6,
      textWrap: "pretty"
    }
  }, description)), onClose && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close (Esc)",
    onClick: onClose
  })), children && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px 0"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      padding: "24px 24px 24px"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmDialog.jsx
try { (() => {
function ConfirmDialog({
  open = true,
  tone = "default",
  icon,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading,
  children,
  fixed
}) {
  const c = {
    default: "var(--orange-500)",
    warning: "var(--status-warning)",
    danger: "var(--status-danger)"
  }[tone];
  const bg = {
    default: "var(--tint-accent)",
    warning: "var(--tint-warning)",
    danger: "var(--tint-danger)"
  }[tone];
  return /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: open,
    fixed: fixed,
    onClose: onCancel,
    width: 420,
    title: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, icon && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: bg,
        color: c,
        display: "grid",
        placeItems: "center"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: 18
    })), title),
    description: description,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "ghost",
      onClick: onCancel
    }, cancelLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: tone === "danger" ? "danger" : "primary",
      loading: loading,
      onClick: onConfirm,
      style: tone === "warning" ? {
        background: "var(--status-warning)"
      } : undefined
    }, confirmLabel))
  }, children);
}
Object.assign(__ds_scope, { ConfirmDialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmDialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = "success",
  message,
  action,
  onAction,
  onClose
}) {
  const m = {
    success: ["check", "var(--status-success)"],
    info: ["info", "var(--status-info)"],
    danger: ["circle-alert", "var(--status-danger)"],
    warning: ["triangle-alert", "var(--status-warning)"]
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      minHeight: 40,
      padding: "0 6px 0 14px",
      borderRadius: "var(--radius-pill)",
      background: "var(--ink-4)",
      boxShadow: "var(--shadow-pop)",
      color: "var(--fg-1)",
      font: "500 13px/1.3 var(--font-sans)",
      animation: "dd-pop var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m[0],
    size: 15,
    color: m[1],
    strokeWidth: 2.25
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      paddingRight: action || onClose ? 0 : 8
    }
  }, message), action && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAction,
    style: {
      border: 0,
      background: "transparent",
      color: "var(--orange-400)",
      font: "600 13px/1 var(--font-sans)",
      cursor: "pointer",
      padding: "0 6px"
    }
  }, action), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      width: 28,
      height: 28,
      border: 0,
      borderRadius: "50%",
      background: "transparent",
      color: "var(--fg-3)",
      display: "grid",
      placeItems: "center",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  onChange,
  label
}) {
  return /*#__PURE__*/React.createElement("label", {
    onClick: () => onChange && onChange(!checked),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      font: "var(--text-body)",
      color: "var(--fg-1)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 5,
      display: "grid",
      placeItems: "center",
      background: checked ? "var(--surface-accent)" : "transparent",
      border: `1px solid ${checked ? "transparent" : "var(--border-strong)"}`,
      color: "var(--ink-1)"
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 11,
    strokeWidth: 3
  })), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function Field({
  label,
  helper,
  error,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 0
    }
  }, (label || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      font: "500 12px/1.2 var(--font-sans)",
      color: "var(--fg-2)"
    }
  }, label, hint && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, hint)), children, (error || helper) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-helper)",
      color: error ? "var(--status-danger)" : "var(--fg-3)"
    }
  }, error || helper));
}
function fieldBox({
  focus,
  error,
  disabled
}) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    padding: "0 12px",
    boxSizing: "border-box",
    borderRadius: "var(--radius-sm)",
    background: disabled ? "transparent" : "var(--surface-field)",
    border: `1px solid ${error ? "var(--status-danger)" : focus ? "var(--border-accent)" : "var(--border-default)"}`,
    boxShadow: focus && !error ? "var(--focus-ring)" : "none",
    color: "var(--fg-3)",
    opacity: disabled ? .5 : 1,
    transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)"
  };
}
Object.assign(__ds_scope, { Field, fieldBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/DatePicker.jsx
try { (() => {
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function formatDate(d) {
  return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}
function DatePicker({
  label,
  helper,
  value,
  onChange,
  minDate,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const d = value || new Date();
  const [view, setView] = React.useState(new Date(d.getFullYear(), d.getMonth(), 1));
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const first = (view.getDay() + 6) % 7,
    days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({
    length: days
  }, (_, i) => i + 1)];
  const same = (a, b) => a && b && a.toDateString() === b.toDateString();
  const today = new Date();
  return /*#__PURE__*/React.createElement(__ds_scope.Field, {
    label: label,
    helper: helper
  }, /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      position: "relative",
      display: "block",
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(!open),
    style: {
      ...__ds_scope.fieldBox({
        focus: open
      }),
      width: "100%",
      cursor: "pointer",
      color: "var(--fg-1)",
      font: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 15,
    color: "var(--fg-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: "left"
    }
  }, formatDate(d)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    color: "var(--fg-3)"
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 4px)",
      left: 0,
      zIndex: 40,
      width: 252,
      padding: 12,
      borderRadius: "var(--radius-md)",
      background: "var(--ink-3)",
      boxShadow: "var(--shadow-pop)",
      animation: "dd-pop var(--dur-fast) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      font: "600 13px/1 var(--font-sans)",
      color: "var(--fg-1)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1)),
    style: navBtn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-left",
    size: 15
  })), MONTHS[view.getMonth()], " ", view.getFullYear(), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1)),
    style: navBtn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7,1fr)",
      gap: 2,
      textAlign: "center"
    }
  }, ["M", "T", "W", "T", "F", "S", "S"].map((w, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: "500 11px/24px var(--font-sans)",
      color: "var(--fg-3)"
    }
  }, w)), cells.map((n, i) => {
    if (!n) return /*#__PURE__*/React.createElement("span", {
      key: i
    });
    const cd = new Date(view.getFullYear(), view.getMonth(), n);
    const sel = same(cd, d);
    const dis = minDate && cd < new Date(minDate.toDateString());
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: i,
      disabled: dis,
      onClick: () => {
        onChange && onChange(cd);
        setOpen(false);
      },
      style: {
        height: 30,
        border: same(cd, today) && !sel ? "1px solid var(--border-strong)" : "1px solid transparent",
        borderRadius: "50%",
        background: sel ? "var(--surface-accent)" : "transparent",
        color: sel ? "var(--fg-on-accent)" : dis ? "var(--fg-3)" : "var(--fg-1)",
        opacity: dis ? .4 : 1,
        font: "500 12px/1 var(--font-sans)",
        cursor: dis ? "default" : "pointer"
      }
    }, n);
  })))));
}
const navBtn = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: 0,
  background: "transparent",
  color: "var(--fg-2)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer"
};
Object.assign(__ds_scope, { formatDate, DatePicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/DatePicker.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  helper,
  error,
  hint,
  icon,
  placeholder,
  value,
  defaultValue,
  onChange,
  type = "text",
  disabled,
  readOnly,
  style
}) {
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement(__ds_scope.Field, {
    label: label,
    helper: helper,
    error: error,
    hint: hint
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...__ds_scope.fieldBox({
        focus: f,
        error,
        disabled
      }),
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15
  }), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    defaultValue: defaultValue,
    disabled: disabled,
    readOnly: readOnly,
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder,
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      flex: 1,
      minWidth: 0,
      height: 34,
      background: "transparent",
      border: 0,
      outline: 0,
      color: "var(--fg-1)",
      font: "var(--text-body)",
      padding: 0
    }
  }), error && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-alert",
    size: 15,
    color: "var(--status-danger)"
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/RadioCard.jsx
try { (() => {
function RadioCard({
  checked,
  onChange,
  title,
  description,
  badge,
  tone
}) {
  const [h, setH] = React.useState(false);
  const warn = tone === "warning" && checked;
  return /*#__PURE__*/React.createElement("div", {
    role: "radio",
    "aria-checked": !!checked,
    onClick: () => onChange && onChange(),
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "flex",
      gap: 12,
      padding: "12px 14px",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      background: checked ? warn ? "var(--tint-warning)" : "var(--tint-accent)" : h ? "rgba(255,255,255,.03)" : "transparent",
      border: `1px solid ${checked ? warn ? "rgba(245,211,67,.45)" : "rgba(246,162,58,.5)" : "var(--border-default)"}`,
      transition: "background var(--dur-fast)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 2,
      width: 16,
      height: 16,
      flexShrink: 0,
      borderRadius: "50%",
      border: `1.5px solid ${checked ? warn ? "var(--status-warning)" : "var(--orange-500)" : "var(--border-strong)"}`,
      display: "grid",
      placeItems: "center"
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: warn ? "var(--status-warning)" : "var(--orange-500)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      font: "500 14px/1.3 var(--font-sans)",
      color: "var(--fg-1)"
    }
  }, title, badge && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 11px/1 var(--font-sans)",
      color: "var(--fg-3)"
    }
  }, badge)), description && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-helper)",
      color: "var(--fg-3)"
    }
  }, description)));
}
Object.assign(__ds_scope, { RadioCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RadioCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  helper,
  value,
  options = [],
  onChange,
  disabled,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const opts = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  const cur = opts.find(o => o.value === value);
  return /*#__PURE__*/React.createElement(__ds_scope.Field, {
    label: label,
    helper: helper
  }, /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      position: "relative",
      display: "block",
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => setOpen(!open),
    style: {
      ...__ds_scope.fieldBox({
        focus: open,
        disabled
      }),
      width: "100%",
      cursor: "pointer",
      justifyContent: "space-between",
      color: "var(--fg-1)",
      font: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, cur ? cur.label : "Select…"), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    color: "var(--fg-3)"
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 4px)",
      left: 0,
      right: 0,
      zIndex: 40,
      padding: 4,
      borderRadius: "var(--radius-md)",
      background: "var(--ink-3)",
      boxShadow: "var(--shadow-pop)",
      animation: "dd-pop var(--dur-fast) var(--ease-out)"
    }
  }, opts.map(o => /*#__PURE__*/React.createElement("div", {
    key: o.value,
    onMouseDown: e => {
      e.preventDefault();
      onChange && onChange(o.value);
      setOpen(false);
    },
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 10px",
      borderRadius: "var(--radius-xs)",
      font: "var(--text-body)",
      color: "var(--fg-1)",
      cursor: "pointer",
      background: o.value === value ? "rgba(255,255,255,.06)" : "transparent"
    }
  }, o.label, o.value === value && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    color: "var(--orange-500)"
  }))))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  label,
  disabled
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "default" : "pointer",
      font: "var(--text-body)",
      color: "var(--fg-1)",
      opacity: disabled ? .5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": !!checked,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: "relative",
      width: 34,
      height: 20,
      flexShrink: 0,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--surface-accent)" : "var(--ink-5)",
      transition: "background var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 17 : 3,
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: checked ? "var(--ink-1)" : "var(--grey-1)",
      transition: "left var(--dur-base) var(--ease-out)"
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function Textarea({
  label,
  helper,
  error,
  hint,
  placeholder,
  value,
  onChange,
  rows = 3,
  disabled,
  mono,
  autoFocus,
  textareaRef,
  style
}) {
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement(__ds_scope.Field, {
    label: label,
    helper: helper,
    error: error,
    hint: hint
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...__ds_scope.fieldBox({
        focus: f,
        error,
        disabled
      }),
      alignItems: "stretch",
      padding: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: textareaRef,
    rows: rows,
    value: value,
    disabled: disabled,
    autoFocus: autoFocus,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      flex: 1,
      minWidth: 0,
      resize: "vertical",
      background: "transparent",
      border: 0,
      outline: 0,
      color: "var(--fg-1)",
      font: mono ? "400 13px/1.6 var(--font-mono)" : "var(--text-body)",
      padding: "9px 12px"
    }
  })));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/forms/TimePicker.jsx
try { (() => {
function slots(step) {
  const out = [];
  for (let m = 7 * 60; m <= 21 * 60; m += step) {
    const h = Math.floor(m / 60),
      mm = m % 60;
    const h12 = (h + 11) % 12 + 1;
    out.push(h12 + ":" + String(mm).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM"));
  }
  return out;
}
function TimePicker({
  label,
  helper,
  value = "5:00 PM",
  onChange,
  step = 15,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const list = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    const el = list.current && list.current.querySelector("[data-sel]");
    if (el) list.current.scrollTop = el.offsetTop - 80;
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return /*#__PURE__*/React.createElement(__ds_scope.Field, {
    label: label,
    helper: helper
  }, /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      position: "relative",
      display: "block",
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(!open),
    style: {
      ...__ds_scope.fieldBox({
        focus: open
      }),
      width: "100%",
      cursor: "pointer",
      color: "var(--fg-1)",
      font: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 15,
    color: "var(--fg-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: "left"
    }
  }, value), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    color: "var(--fg-3)"
  })), open && /*#__PURE__*/React.createElement("div", {
    ref: list,
    style: {
      position: "absolute",
      top: "calc(100% + 4px)",
      left: 0,
      right: 0,
      zIndex: 40,
      maxHeight: 208,
      overflowY: "auto",
      padding: 4,
      borderRadius: "var(--radius-md)",
      background: "var(--ink-3)",
      boxShadow: "var(--shadow-pop)",
      animation: "dd-pop var(--dur-fast) var(--ease-out)"
    }
  }, slots(step).map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    "data-sel": t === value ? "" : undefined,
    onMouseDown: e => {
      e.preventDefault();
      onChange && onChange(t);
      setOpen(false);
    },
    style: {
      padding: "7px 10px",
      borderRadius: "var(--radius-xs)",
      font: "var(--text-body)",
      fontVariantNumeric: "tabular-nums",
      color: t === value ? "var(--orange-500)" : "var(--fg-1)",
      background: t === value ? "var(--tint-accent)" : "transparent",
      cursor: "pointer"
    }
  }, t)))));
}
Object.assign(__ds_scope, { TimePicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TimePicker.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function Card({
  title,
  subtitle,
  actions,
  children,
  padding = 20,
  onClick,
  selected,
  style
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      borderRadius: "var(--radius-lg)",
      background: onClick && h ? "var(--surface-card-hover)" : "var(--surface-card)",
      border: `1px solid ${selected ? "var(--border-accent)" : "var(--border-subtle)"}`,
      cursor: onClick ? "pointer" : "default",
      transition: "background var(--dur-fast)",
      ...style
    }
  }, (title || actions) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: `${padding - 4}px ${padding}px 0`
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-section)",
      color: "var(--fg-1)"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginTop: 3
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, actions)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/layout/NotchCard.jsx
try { (() => {
function NotchCard({
  children,
  accent,
  actions = ["arrow-up-right"],
  onAction,
  width,
  minHeight = 150,
  onClick,
  style
}) {
  const [h, setH] = React.useState(false);
  const n = actions.length,
    btn = 36,
    gap = 4,
    pad = 4,
    r = 18;
  const cutW = n * btn + (n - 1) * gap + pad * 2 + 2,
    cutH = btn + pad * 2 + 2;
  const bg = accent ? "var(--surface-accent)" : h && onClick ? "var(--surface-card-hover)" : "var(--surface-card)";
  const piece = {
    position: "absolute",
    background: bg,
    transition: "background var(--dur-base)"
  };
  if (!n) return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: "relative",
      width,
      minHeight,
      boxSizing: "border-box",
      borderRadius: r,
      background: bg,
      transition: "background var(--dur-base)",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "16px 16px 14px",
      color: accent ? "var(--fg-on-accent)" : "var(--fg-1)"
    }
  }, children));
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: "relative",
      width,
      minHeight,
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...piece,
      left: 0,
      top: 0,
      width: `calc(100% - ${cutW}px)`,
      height: cutH + r,
      borderRadius: `${r}px ${r}px 0 0`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...piece,
      left: 0,
      right: 0,
      top: cutH,
      bottom: 0,
      borderRadius: `0 ${r}px ${r}px ${r}px`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...piece,
      left: `calc(100% - ${cutW}px)`,
      top: cutH - r,
      width: r,
      height: r,
      WebkitMask: `radial-gradient(circle at 100% 0,transparent ${r - .5}px,#000 ${r}px)`,
      mask: `radial-gradient(circle at 100% 0,transparent ${r - .5}px,#000 ${r}px)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: pad - 2,
      right: pad - 2,
      display: "flex",
      gap
    }
  }, actions.map(a => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: a,
    icon: a,
    variant: "outline",
    size: btn,
    onClick: e => {
      e && e.stopPropagation && e.stopPropagation();
      onAction && onAction(a);
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "16px 16px 14px",
      color: accent ? "var(--fg-on-accent)" : "var(--fg-1)"
    }
  }, children));
}
Object.assign(__ds_scope, { NotchCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/NotchCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ConnectionStatus.jsx
try { (() => {
function ConnectionStatus({
  connected = true,
  label = "Zimbra",
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      height: 30,
      padding: "0 10px",
      border: 0,
      borderRadius: "var(--radius-sm)",
      background: h ? "rgba(255,255,255,.04)" : "transparent",
      color: "var(--fg-3)",
      font: "500 12px/1 var(--font-sans)",
      cursor: onClick ? "pointer" : "default",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      boxSizing: "border-box",
      background: connected ? "var(--status-success)" : "transparent",
      border: connected ? "0" : "1.5px solid var(--fg-3)"
    }
  }), label, " ", connected ? "Connected" : "Disconnected");
}
Object.assign(__ds_scope, { ConnectionStatus });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ConnectionStatus.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AppSidebar.jsx
try { (() => {
function NavItem({
  item,
  active,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 32,
      padding: "0 10px",
      border: 0,
      borderRadius: "var(--radius-sm)",
      background: active ? "var(--ink-4)" : h ? "rgba(255,255,255,.04)" : "transparent",
      color: active ? "var(--fg-1)" : "var(--fg-2)",
      font: `${active ? 600 : 500} 13px/1 var(--font-sans)`,
      cursor: "pointer",
      textAlign: "left",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 16,
    color: active ? "var(--orange-500)" : "currentColor"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.count ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: item.countTone || "neutral"
  }, item.count) : item.kbd && h ? /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, item.kbd) : null);
}
function AppSidebar({
  items = [],
  value,
  onChange,
  connected = true,
  onConnectionClick,
  footer
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      width: "var(--sidebar-width)",
      height: "100%",
      boxSizing: "border-box",
      padding: "12px 10px",
      background: "var(--surface-sidebar)",
      borderRight: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    active: it.id === value,
    onClick: () => onChange && onChange(it.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), footer, /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--border-subtle)",
      paddingTop: 10,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ConnectionStatus, {
    connected: connected,
    onClick: onConnectionClick
  })));
}
Object.assign(__ds_scope, { AppSidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AppSidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/Dialogs.jsx
try { (() => {
function ScheduleModal({
  s,
  a
}) {
  const {
    Modal,
    Button,
    DatePicker,
    TimePicker,
    Input,
    Icon
  } = window.ZimbraDigestDesignSystem_9514e4;
  const [d, setD] = React.useState(s.schedule.date);
  const [t, setT] = React.useState(s.schedule.time);
  const [to, setTo] = React.useState(s.schedule.to);
  const bad = !/^\S+@\S+\.\S+$/.test(to);
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Schedule Daily Digest",
    onClose: a.closeModal,
    width: 460,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: a.closeModal
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "clock",
      disabled: bad,
      onClick: () => a.confirmSchedule({
        date: d,
        time: t,
        to
      })
    }, "Schedule Digest"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(DatePicker, {
    label: "Send date",
    value: d,
    onChange: setD,
    minDate: DD.today
  }), /*#__PURE__*/React.createElement(TimePicker, {
    label: "Send time",
    value: t,
    onChange: setT
  })), /*#__PURE__*/React.createElement(Input, {
    label: "Recipient",
    value: to,
    onChange: setTo,
    error: bad ? "Enter a valid email address." : undefined
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      paddingTop: 16,
      borderTop: "1px solid var(--border-subtle)",
      font: "var(--text-body)",
      color: "var(--fg-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      textWrap: "pretty"
    }
  }, "The generated digest will be saved ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--fg-1)",
      fontWeight: 600
    }
  }, "exactly as currently shown"), " and prepared in Zimbra at the scheduled time."))));
}
function SendModal({
  s,
  a
}) {
  const {
    Modal,
    Button
  } = window.ZimbraDigestDesignSystem_9514e4;
  const row = (k, v) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "80px 1fr",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)"
    }
  }, k), /*#__PURE__*/React.createElement("span", null, v));
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Send Daily Digest?",
    onClose: a.closeModal,
    width: 440,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: a.closeModal
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconRight: "external-link",
      loading: s.opening,
      onClick: a.confirmSend
    }, "Open Zimbra"))
  }, /*#__PURE__*/React.createElement("div", null, row("Recipient", s.schedule.to), row("Subject", "Daily Digest - " + DD.fmt(s.date))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px 0 0",
      color: "var(--fg-2)",
      textWrap: "pretty"
    }
  }, "This digest is ready to be opened in Zimbra. You will have a chance to review the email before it is sent."));
}
function ZimbraModal({
  s,
  a
}) {
  const {
    Modal,
    Button,
    Input,
    StatusBadge,
    Banner
  } = window.ZimbraDigestDesignSystem_9514e4;
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Zimbra Connection",
    onClose: a.closeModal,
    width: 440,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      iconRight: "external-link",
      disabled: !s.zimbra,
      onClick: a.openZimbra
    }, "Open Zimbra"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      loading: s.testing,
      onClick: a.testZimbra
    }, "Test Connection"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Zimbra URL",
    value: DD.zimbraUrl,
    readOnly: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 12px/1.2 var(--font-sans)",
      color: "var(--fg-2)",
      marginBottom: 8
    }
  }, "Status"), s.zimbra ? /*#__PURE__*/React.createElement(StatusBadge, {
    status: "sent",
    label: "Connected"
  }) : /*#__PURE__*/React.createElement(StatusBadge, {
    status: "none",
    label: "Disconnected"
  })), !s.zimbra && /*#__PURE__*/React.createElement(Banner, {
    tone: "warning",
    title: "Zimbra isn't reachable."
  }, "Scheduled digests can't be prepared until the connection is back. Check your network or VPN, then test again.")));
}
function ZimbraErrorDialog({
  a
}) {
  const {
    ConfirmDialog,
    Banner
  } = window.ZimbraDigestDesignSystem_9514e4;
  return /*#__PURE__*/React.createElement(ConfirmDialog, {
    tone: "danger",
    icon: "circle-alert",
    title: "Unable to open Zimbra.",
    description: "Check your connection or Zimbra URL. Your digest is still saved.",
    confirmLabel: "Try Again",
    cancelLabel: "Close",
    onConfirm: a.retryZimbra,
    onCancel: a.closeModal
  }, /*#__PURE__*/React.createElement(Banner, {
    tone: "info",
    title: "Nothing was sent.",
    details: "ECONNREFUSED https://mail.company.local:443\nat ZimbraSession.open (zimbra.js:88)"
  }));
}
function AutoSendDialog({
  a
}) {
  const {
    ConfirmDialog
  } = window.ZimbraDigestDesignSystem_9514e4;
  return /*#__PURE__*/React.createElement(ConfirmDialog, {
    tone: "warning",
    icon: "triangle-alert",
    title: "Automatic Sending",
    description: /*#__PURE__*/React.createElement(React.Fragment, null, "Automatic sending is currently ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--fg-1)"
      }
    }, "OFF"), ".", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), "When enabled, scheduled digests may be sent through your Zimbra account without manual confirmation."),
    confirmLabel: "Enable Automatic Sending",
    onConfirm: a.enableAuto,
    onCancel: a.closeModal
  });
}
Object.assign(window, {
  ScheduleModal,
  SendModal,
  ZimbraModal,
  ZimbraErrorDialog,
  AutoSendDialog
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/Dialogs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/HomeScreen.jsx
try { (() => {
function HomeScreen({
  s,
  a
}) {
  const {
    NotchCard,
    Button,
    StatusBadge,
    Banner,
    Card,
    Kbd,
    Icon
  } = window.ZimbraDigestDesignSystem_9514e4;
  const st = s.digestStatus;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: "0 auto",
      padding: "56px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: "600 26px/1.25 var(--font-sans)"
    }
  }, "Good afternoon, ", DD.user.first, "."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      font: "400 15px/1.5 var(--font-sans)",
      color: "var(--fg-2)"
    }
  }, st === "none" ? "Ready to create today's digest?" : st === "scheduled" ? "Today's digest is scheduled. Nothing else to do." : st === "sent" ? "Today's digest is done." : "Today's digest is waiting for your review.")), s.missed && /*#__PURE__*/React.createElement(Banner, {
    tone: "warning",
    title: "Missed scheduled digest",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: a.prepareMissed
    }, "Prepare Now"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: a.dismissMissed
    }, "Cancel"))
  }, "Your Daily Digest was scheduled for 5:00 PM yesterday but the application was closed. ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--fg-1)"
    }
  }, "No email was sent.")), /*#__PURE__*/React.createElement(NotchCard, {
    minHeight: 210,
    actions: st === "none" ? [] : ["arrow-up-right"],
    onAction: a.openDigest
  }, /*#__PURE__*/React.createElement(Overline, null, "Today's Digest"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 28,
      margin: "18px 0 22px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-led-small)",
      color: "var(--fg-1)"
    }
  }, "OCT 8"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, DD.fmt(DD.today))), st === "scheduled" && /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: "1px solid var(--border-subtle)",
      paddingLeft: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-led-small)",
      color: "var(--fg-accent)"
    }
  }, s.schedule.time), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, "Sends to ", s.schedule.to))), st === "none" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "No digest created yet."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "square-pen",
    kbd: "\u2318N",
    onClick: a.newDigest
  }, "Create Today's Digest")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: st,
    detail: st === "scheduled" ? "Today at " + s.schedule.time : st === "sent" ? s.sentAt : undefined
  }), (st === "ready" || st === "draft") && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, "Last edited ", s.editedAt), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), st === "scheduled" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: a.openSchedule
  }, "Change Schedule"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: a.openDigest
  }, "View Digest")) : st === "sent" ? /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: a.openDigest
  }, "View Digest") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "clock",
    onClick: a.openSchedule
  }, "Schedule"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: a.openDigest
  }, "Open Digest")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Overline, null, "Recent"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    iconRight: "arrow-right",
    onClick: () => a.go("history")
  }, "History")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, s.history.slice(0, 3).map(h => /*#__PURE__*/React.createElement(Card, {
    key: h.id,
    padding: 14,
    onClick: () => a.openHistory(h.id)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 16,
    color: "var(--fg-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, h.dateLabel), /*#__PURE__*/React.createElement(StatusBadge, {
    size: "sm",
    status: "sent",
    detail: h.time
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 20,
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Kbd, null, "\u2318N"), "New digest"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Kbd, null, "\u2318\u21B5"), "Generate"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Kbd, null, "\u2318\u21E7S"), "Schedule"))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/ListScreens.jsx
try { (() => {
function ScheduledScreen({
  s,
  a
}) {
  const {
    Card,
    Button,
    StatusBadge,
    Banner,
    EmptyState,
    Icon
  } = window.ZimbraDigestDesignSystem_9514e4;
  const today = s.digestStatus === "scheduled" ? [{
    id: "today",
    date: s.schedule.date,
    time: s.schedule.time,
    to: s.schedule.to,
    today: true
  }] : [];
  const groups = [["Today", today.filter(x => x.date.toDateString() === DD.today.toDateString())], ["Later", [...today.filter(x => x.date.toDateString() !== DD.today.toDateString()), ...s.upcoming]]].filter(g => g[1].length);
  const label = d => {
    const diff = Math.round((d - DD.today) / 864e5);
    return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : DD.MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate();
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Scheduled"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      padding: "28px",
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, s.missed && /*#__PURE__*/React.createElement(Banner, {
    tone: "warning",
    title: "Missed scheduled digest",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: a.prepareMissed
    }, "Prepare Now"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: a.dismissMissed
    }, "Cancel"))
  }, "Your Daily Digest was scheduled for 5:00 PM on October 7 but the application was closed. ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--fg-1)"
    }
  }, "No email was sent.")), !groups.length && !s.missed && /*#__PURE__*/React.createElement(EmptyState, {
    icon: "clock",
    title: "Nothing scheduled"
  }, "Your scheduled digests will appear here."), groups.map(([g, items]) => /*#__PURE__*/React.createElement("div", {
    key: g,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Overline, null, g === "Today" ? "Today" : label(items[0].date) === "Tomorrow" ? "Tomorrow" : "Later"), items.map(it => /*#__PURE__*/React.createElement(Card, {
    key: it.id,
    padding: 18
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-led-small)",
      color: it.today ? "var(--fg-accent)" : "var(--fg-1)"
    }
  }, it.time), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginTop: 6
    }
  }, label(it.date))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 14px/1.3 var(--font-sans)"
    }
  }, "Daily Digest", it.today ? "" : " · not generated yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginTop: 4,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 12
  }), it.to)), /*#__PURE__*/React.createElement(StatusBadge, {
    status: it.today ? "scheduled" : "draft",
    label: it.today ? undefined : "Reminder",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, it.today && /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    onClick: a.openDigest
  }, "View"), it.today && /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline",
    onClick: a.openSchedule
  }, "Edit"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => it.today ? a.cancelSchedule() : a.removeUpcoming(it.id)
  }, "Cancel"))))))))));
}
function HistoryScreen({
  s,
  a
}) {
  const {
    Card,
    Button,
    StatusBadge,
    EmptyState
  } = window.ZimbraDigestDesignSystem_9514e4;
  const sel = s.history.find(h => h.id === s.historySel) || s.history[0];
  if (!s.history.length) return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "History"
  }), /*#__PURE__*/React.createElement(EmptyState, {
    icon: "history",
    title: "No previous digests"
  }, "Once you send a digest, it will appear here."));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "History",
    meta: s.history.length + " digests"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateColumns: "340px minmax(0,1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRight: "1px solid var(--border-subtle)",
      overflowY: "auto",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, s.history.map(h => /*#__PURE__*/React.createElement(Card, {
    key: h.id,
    padding: 14,
    selected: h.id === sel.id,
    onClick: () => a.selectHistory(h.id)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 14px/1.3 var(--font-sans)"
    }
  }, h.dateLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, "Daily Digest"), /*#__PURE__*/React.createElement(StatusBadge, {
    size: "sm",
    status: "sent",
    detail: h.time
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 28px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Overline, null, sel.dateLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    icon: "copy",
    onClick: () => a.duplicate(sel)
  }, "Duplicate")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "20px 28px"
    }
  }, /*#__PURE__*/React.createElement(DigestDocument, {
    blocks: sel.blocks,
    subject: "Daily Digest - " + sel.dateLabel,
    to: DD.recipient
  })))));
}
Object.assign(window, {
  ScheduledScreen,
  HistoryScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/ListScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/NewDigestScreen.jsx
try { (() => {
function InputPane({
  s,
  a
}) {
  const {
    DatePicker,
    Textarea,
    Button
  } = window.ZimbraDigestDesignSystem_9514e4;
  const n = s.notes,
    busy = s.stage === "generating";
  const set = k => v => a.setNotes({
    ...n,
    [k]: v
  });
  const empty = !Object.values(n).some(v => v.trim());
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      opacity: busy ? .5 : 1,
      pointerEvents: busy ? "none" : "auto"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--fg-2)"
    }
  }, "Write what you worked on. We'll turn it into your daily digest."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 240
    }
  }, /*#__PURE__*/React.createElement(DatePicker, {
    label: "Date",
    value: s.date,
    onChange: a.setDate
  })), /*#__PURE__*/React.createElement(Textarea, {
    label: "Today's work",
    rows: 6,
    autoFocus: true,
    value: n.work,
    onChange: set("work"),
    placeholder: "Example:\nWorked on Hibernate Criteria queries,\nfixed duplicate results, and continued\nthe Office repository."
  }), /*#__PURE__*/React.createElement(Textarea, {
    label: "Topics / Lessons",
    hint: "Optional",
    rows: 2,
    value: n.topics,
    onChange: set("topics"),
    placeholder: "What did you study or learn today?"
  }), /*#__PURE__*/React.createElement(Textarea, {
    label: "In progress",
    hint: "Optional",
    rows: 2,
    value: n.progress,
    onChange: set("progress"),
    placeholder: "What are you still working on?"
  }), /*#__PURE__*/React.createElement(Textarea, {
    label: "Blockers",
    hint: "Optional",
    rows: 2,
    value: n.blockers,
    onChange: set("blockers"),
    placeholder: "Anything blocking your progress?"
  }), /*#__PURE__*/React.createElement(Textarea, {
    label: "Tomorrow",
    hint: "Optional",
    rows: 2,
    value: n.tomorrow,
    onChange: set("tomorrow"),
    placeholder: "What do you plan to work on next?"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 28px",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, empty && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "copy",
    onClick: a.fillSample
  }, "Use sample notes"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: busy ? undefined : "sparkles",
    loading: busy,
    disabled: empty,
    kbd: busy ? undefined : "⌘↵",
    onClick: a.generate
  }, busy ? "Generating…" : "Generate Digest")));
}
function NotesSummary({
  s,
  a
}) {
  const {
    Button
  } = window.ZimbraDigestDesignSystem_9514e4;
  const L = {
    work: "Today's work",
    topics: "Topics / Lessons",
    progress: "In progress",
    blockers: "Blockers",
    tomorrow: "Tomorrow"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      overflowY: "auto",
      height: "100%",
      boxSizing: "border-box"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Overline, null, "Your notes"), s.stage === "preview" && /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "pencil",
    onClick: a.editNotes
  }, "Edit notes")), Object.keys(L).filter(k => s.notes[k].trim()).map(k => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 12px/1.2 var(--font-sans)",
      color: "var(--fg-2)",
      marginBottom: 6
    }
  }, L[k]), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 13px/1.55 var(--font-mono)",
      color: "var(--fg-3)",
      whiteSpace: "pre-wrap"
    }
  }, s.notes[k]))));
}
function ScheduledPanel({
  s,
  a
}) {
  const {
    Button,
    StatusBadge,
    Icon
  } = window.ZimbraDigestDesignSystem_9514e4;
  const sent = s.digestStatus === "sent";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: sent ? "var(--tint-success)" : "var(--tint-info)",
      color: sent ? "var(--status-success)" : "var(--status-info)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: sent ? "check" : "clock",
    size: 15,
    strokeWidth: 2.4
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 15px/1.2 var(--font-sans)"
    }
  }, sent ? "Prepared in Zimbra" : "Digest scheduled")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-led-time)",
      color: sent ? "var(--fg-1)" : "var(--fg-accent)"
    }
  }, sent ? s.sentAt : s.schedule.time), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body)",
      color: "var(--fg-2)",
      marginTop: 10
    }
  }, DD.fmt(s.schedule.date))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginBottom: 4
    }
  }, "Recipient"), /*#__PURE__*/React.createElement("div", null, s.schedule.to)), sent ? /*#__PURE__*/React.createElement(StatusBadge, {
    status: "sent",
    detail: s.sentAt
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "clock",
    full: true,
    onClick: a.openSchedule
  }, "Edit Schedule"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    full: true,
    onClick: a.cancelSchedule
  }, "Cancel Schedule")), !sent && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: "var(--text-helper)",
      color: "var(--fg-3)"
    }
  }, "At ", s.schedule.time, " the app opens Zimbra with this email ready. You review it and press Send."));
}
function GeneratingSteps({
  step
}) {
  const {
    Icon
  } = window.ZimbraDigestDesignSystem_9514e4;
  const steps = ["Organizing your notes", "Applying your template", "Preparing preview"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      padding: "48px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 15px/1.3 var(--font-sans)",
      marginBottom: 6
    }
  }, "Generating your digest\u2026"), steps.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: i < step ? "var(--fg-2)" : i === step ? "var(--fg-1)" : "var(--fg-3)",
      transition: "color var(--dur-base)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      display: "flex",
      justifyContent: "center",
      color: i < step ? "var(--status-success)" : "var(--fg-2)",
      animation: i === step ? "dd-spin .9s linear infinite" : "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i < step ? "check" : i === step ? "loader-circle" : "circle",
    size: i < step || i === step ? 16 : 8,
    strokeWidth: i < step ? 2.5 : 1.75
  })), t)));
}
function PreviewPlaceholder() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px dashed var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "28px",
      display: "flex",
      flexDirection: "column",
      gap: 22
    }
  }, ["TASK TODAY", "PLANS FOR THE WEEK", "TOPICS"].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 11px/1 var(--font-sans)",
      letterSpacing: ".06em",
      color: "var(--fg-3)",
      marginBottom: 10
    }
  }, t), [80, 62, 70].slice(0, 3 - i).map((w, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 8,
      width: w + "%",
      borderRadius: 4,
      background: "var(--ink-3)",
      marginBottom: 8
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, "Your digest preview appears here after you generate it."));
}
function NewDigestScreen({
  s,
  a
}) {
  const {
    Button,
    StatusBadge,
    Banner,
    Tag,
    Kbd
  } = window.ZimbraDigestDesignSystem_9514e4;
  const stage = s.stage,
    review = ["preview", "editing", "scheduled"].includes(stage);
  const locked = stage === "scheduled";
  const subject = "Daily Digest - " + DD.fmt(s.date);
  const statusMap = {
    form: s.digestStatus === "none" ? "draft" : s.digestStatus,
    generating: "generating",
    error: "failed",
    preview: "ready",
    editing: "ready",
    scheduled: s.digestStatus
  };
  const bs = statusMap[stage];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: review ? "Today's Digest" : "New Digest",
    meta: DD.fmt(s.date),
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, stage === "editing" && /*#__PURE__*/React.createElement(StatusBadge, {
      status: "draft",
      label: "Editing"
    }), /*#__PURE__*/React.createElement(StatusBadge, {
      status: bs,
      label: stage === "error" ? "Generation failed" : undefined,
      detail: bs === "scheduled" ? s.schedule.time : bs === "sent" ? s.sentAt : undefined
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateColumns: review ? "320px minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)",
      transition: "grid-template-columns var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRight: "1px solid var(--border-subtle)",
      minHeight: 0,
      overflow: "hidden"
    }
  }, locked ? /*#__PURE__*/React.createElement(ScheduledPanel, {
    s: s,
    a: a
  }) : review ? /*#__PURE__*/React.createElement(NotesSummary, {
    s: s,
    a: a
  }) : /*#__PURE__*/React.createElement(InputPane, {
    s: s,
    a: a
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "16px 28px 0"
    }
  }, /*#__PURE__*/React.createElement(Overline, null, "Preview"), review && /*#__PURE__*/React.createElement(Tag, {
    style: {
      height: 20,
      fontSize: 11
    }
  }, "Generated with Gemini"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), review && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-meta)",
      color: stage === "editing" ? "var(--orange-400)" : "var(--fg-3)"
    }
  }, stage === "editing" ? "Editing" : locked ? s.digestStatus === "sent" ? "Sent · read only" : "Scheduled · locked" : "Viewing")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "14px 28px 24px"
    }
  }, stage === "form" && /*#__PURE__*/React.createElement(PreviewPlaceholder, null), stage === "generating" && /*#__PURE__*/React.createElement(GeneratingSteps, {
    step: s.genStep
  }), stage === "error" && /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement(Banner, {
    tone: "danger",
    title: "Unable to generate your digest.",
    details: "GeminiError: 503 UNAVAILABLE — The model is overloaded. Please try again later.\nrequest_id=7f2c19a0",
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      icon: "refresh-cw",
      onClick: a.generate
    }, "Retry")
  }, "Check your AI connection and try again. Your notes are saved.")), review && /*#__PURE__*/React.createElement(DigestDocument, {
    blocks: s.blocks,
    subject: subject,
    to: s.schedule.to,
    editing: stage === "editing",
    draft: s.draft,
    setDraft: a.setDraft
  })), (stage === "preview" || stage === "editing") && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 28px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-window)"
    }
  }, stage === "preview" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "pencil",
    onClick: a.startEdit
  }, "Edit"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "refresh-cw",
    onClick: a.generate
  }, "Regenerate"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "send",
    onClick: a.openSend
  }, "Send Now"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "clock",
    kbd: "\u2318\u21E7S",
    onClick: a.openSchedule
  }, "Schedule Send")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, "One bullet per line. Changes apply to this digest only."), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: a.cancelEdit
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "check",
    kbd: "\u2318S",
    onClick: a.saveEdit
  }, "Save Changes"))))));
}
window.NewDigestScreen = NewDigestScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/NewDigestScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/SettingsScreen.jsx
try { (() => {
function SettingsScreen({
  s,
  a
}) {
  const {
    Card,
    Button,
    Input,
    Select,
    RadioCard,
    StatusBadge,
    Banner
  } = window.ZimbraDigestDesignSystem_9514e4;
  const [p, setP] = React.useState({
    name: DD.user.name,
    role: DD.user.role,
    to: s.schedule.to,
    subject: "Daily Digest - {date}",
    model: "flash"
  });
  const set = k => v => setP({
    ...p,
    [k]: v
  });
  const row = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Settings",
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      kbd: "\u2318S",
      onClick: a.saveSettings
    }, "Save")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Profile",
    subtitle: "Used in your sign-off"
  }, /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    value: p.name,
    onChange: set("name")
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Role",
    value: p.role,
    onChange: set("role")
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Email"
  }, /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Default recipient",
    value: p.to,
    onChange: set("to")
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Subject format",
    value: p.subject,
    onChange: set("subject"),
    helper: "Daily Digest - October 8, 2026"
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Sending",
    subtitle: "What happens at the scheduled time"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(RadioCard, {
    checked: !s.autoSend,
    onChange: a.disableAuto,
    title: "Prepare email in Zimbra",
    badge: "Recommended",
    description: "The app opens Zimbra with your digest ready. You review it and press Send."
  }), /*#__PURE__*/React.createElement(RadioCard, {
    tone: "warning",
    checked: s.autoSend,
    onChange: () => !s.autoSend && a.setModal("autosend"),
    title: "Automatically send email",
    badge: "Advanced",
    description: "Scheduled digests are sent without you confirming in Zimbra."
  }), s.autoSend && /*#__PURE__*/React.createElement(Banner, {
    tone: "warning",
    title: "Automatic sending is on."
  }, "Scheduled digests will be sent from your Zimbra account without manual confirmation."))), /*#__PURE__*/React.createElement(Card, {
    title: "Zimbra",
    actions: s.zimbra ? /*#__PURE__*/React.createElement(StatusBadge, {
      status: "sent",
      label: "Connected",
      size: "sm"
    }) : /*#__PURE__*/React.createElement(StatusBadge, {
      status: "none",
      label: "Disconnected",
      size: "sm"
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Zimbra URL",
    defaultValue: DD.zimbraUrl
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    iconRight: "external-link",
    disabled: !s.zimbra,
    onClick: a.openZimbra
  }, "Open Zimbra"), /*#__PURE__*/React.createElement(Button, {
    loading: s.testing,
    onClick: a.testZimbra
  }, "Test Connection")))), /*#__PURE__*/React.createElement(Card, {
    title: "AI",
    actions: /*#__PURE__*/React.createElement(StatusBadge, {
      status: "sent",
      label: "Configured",
      size: "sm"
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Gemini API",
    value: "Key saved on this device",
    readOnly: true
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Model",
    value: p.model,
    onChange: set("model"),
    options: [{
      value: "flash",
      label: "Gemini 2.5 Flash"
    }, {
      value: "pro",
      label: "Gemini 2.5 Pro"
    }]
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    loading: s.testingAI,
    onClick: a.testAI
  }, "Test AI Connection")))))));
}
window.SettingsScreen = SettingsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/Shell.jsx
try { (() => {
function WindowFrame({
  width,
  height,
  status,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "var(--shadow-window)",
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-window)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "var(--titlebar-height)",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      background: "var(--surface-titlebar)",
      borderBottom: "1px solid var(--border-subtle)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["#ff5f57", "#febc2e", "#28c840"].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: c
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      font: "var(--text-app-title)",
      color: "var(--fg-2)",
      pointerEvents: "none"
    }
  }, "Daily Digest Assistant"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      position: "relative"
    }
  }, status)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      position: "relative"
    }
  }, children));
}
function AppStatus({
  s
}) {
  const busy = s.stage === "generating";
  const sch = s.digestStatus === "scheduled";
  const c = busy ? "var(--status-info)" : sch ? "var(--status-info)" : s.zimbra ? "var(--status-success)" : "var(--status-warning)";
  const label = busy ? "Generating…" : sch ? "Scheduled · " + s.schedule.time : s.zimbra ? "Ready" : "Offline";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "500 12px/1 var(--font-sans)",
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: c,
      animation: busy ? "dd-pulse 1.2s infinite" : "none"
    }
  }), label);
}
function PageHeader({
  title,
  meta,
  right,
  onBack
}) {
  const {
    IconButton
  } = window.ZimbraDigestDesignSystem_9514e4;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: 60,
      padding: "0 28px",
      borderBottom: "1px solid var(--border-subtle)",
      flexShrink: 0
    }
  }, onBack && /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Back",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: "var(--text-page-title)"
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, meta), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), right);
}
function Overline({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-overline)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--fg-3)",
      ...style
    }
  }, children);
}
function DigestDocument({
  blocks,
  subject,
  to,
  editing,
  draft,
  setDraft,
  dim
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-document)",
      color: "var(--fg-document)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      opacity: dim ? .55 : 1,
      transition: "opacity var(--dur-base)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 28px",
      background: "#f4f4f4",
      borderBottom: "1px solid #e6e6e6",
      display: "grid",
      gridTemplateColumns: "64px 1fr",
      rowGap: 6,
      font: "400 13px/1.3 var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-document-muted)"
    }
  }, "To"), /*#__PURE__*/React.createElement("span", null, to), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-document-muted)"
    }
  }, "Subject"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, subject)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      font: "400 14px/1.6 var(--font-sans)"
    }
  }, blocks.map((b, i) => b.type === "section" ? /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 12px/1 var(--font-sans)",
      letterSpacing: ".06em",
      marginBottom: 8
    }
  }, b.title), editing ? /*#__PURE__*/React.createElement("textarea", {
    value: draft[i],
    onChange: e => setDraft({
      ...draft,
      [i]: e.target.value
    }),
    rows: Math.max(2, (draft[i] || "").split("\n").length),
    style: {
      width: "100%",
      boxSizing: "border-box",
      resize: "vertical",
      border: "1px solid #d7d7d7",
      borderRadius: 8,
      padding: "8px 10px",
      font: "400 14px/1.6 var(--font-sans)",
      color: "var(--fg-document)",
      background: "#fffdf8",
      outline: "none",
      boxShadow: "0 0 0 3px rgba(246,162,58,.18)"
    }
  }) : /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: 20
    }
  }, b.items.map((it, k) => /*#__PURE__*/React.createElement("li", {
    key: k
  }, it)))) : /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: b.text.startsWith("Regards") ? "var(--fg-document)" : "var(--fg-document)"
    }
  }, b.text))));
}
Object.assign(window, {
  WindowFrame,
  AppStatus,
  PageHeader,
  Overline,
  DigestDocument
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/TemplatesScreen.jsx
try { (() => {
function TemplateEditor({
  value,
  onChange
}) {
  const ta = React.useRef(null),
    hl = React.useRef(null);
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = esc(value).replace(/\{(\w+)\}/g, '<span style="color:var(--orange-400);background:var(--tint-accent);border-radius:4px">{$1}</span>') + "\n";
  const box = {
    margin: 0,
    padding: "16px 18px",
    font: "400 13px/1.7 var(--font-mono)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxSizing: "border-box",
    border: 0
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      minHeight: 0,
      borderRadius: "var(--radius-md)",
      background: "var(--surface-field)",
      border: "1px solid var(--border-default)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("pre", {
    ref: hl,
    "aria-hidden": "true",
    style: {
      ...box,
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      color: "var(--fg-2)",
      pointerEvents: "none"
    },
    dangerouslySetInnerHTML: {
      __html: html
    }
  }), /*#__PURE__*/React.createElement("textarea", {
    ref: ta,
    value: value,
    spellCheck: false,
    onChange: e => onChange(e.target.value),
    onScroll: e => {
      hl.current.scrollTop = e.target.scrollTop;
    },
    style: {
      ...box,
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      resize: "none",
      outline: "none",
      background: "transparent",
      color: "transparent",
      caretColor: "var(--fg-1)"
    }
  }), /*#__PURE__*/React.createElement(TemplateEditor.Ref, {
    r: ta
  }));
}
TemplateEditor.Ref = function ({
  r
}) {
  window.__ddTemplateRef = r;
  return null;
};
function TemplatesScreen({
  s,
  a
}) {
  const {
    Card,
    Button,
    StatusBadge,
    Tag,
    Icon
  } = window.ZimbraDigestDesignSystem_9514e4;
  const [text, setText] = React.useState(s.template);
  React.useEffect(() => setText(s.template), [s.template, s.templateEditing]);
  const insert = v => {
    const el = window.__ddTemplateRef && window.__ddTemplateRef.current;
    if (!el) {
      setText(text + v);
      return;
    }
    const p = el.selectionStart;
    setText(text.slice(0, p) + v + text.slice(el.selectionEnd));
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = p + v.length;
    }, 0);
  };
  const vars = ["date", "name", "role", "tasks", "topics", "weekly_plans", "blockers", "tomorrow"];
  if (!s.templateEditing) return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Templates"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 20
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-sm)",
      background: "var(--ink-4)",
      display: "grid",
      placeItems: "center",
      color: "var(--fg-2)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layout-template",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 15px/1.3 var(--font-sans)"
    }
  }, "Daily Digest"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)",
      marginTop: 3
    }
  }, "Used for daily work reports")), /*#__PURE__*/React.createElement(StatusBadge, {
    status: "sent",
    label: "Active",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "pencil",
    onClick: a.editTemplate
  }, "Edit Template")))));
  const preview = DD.render(text, DD.buildVars(DD.sampleNotes, DD.user, DD.today));
  const dirty = text !== s.template;
  window.__ddSaveTemplate = () => dirty && a.saveTemplate(text);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Daily Digest Template",
    onBack: a.closeTemplate,
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, dirty && /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--text-meta)",
        color: "var(--fg-3)"
      }
    }, "Unsaved changes"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: a.closeTemplate
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "check",
      kbd: "\u2318S",
      disabled: !dirty,
      onClick: () => a.saveTemplate(text)
    }, "Save Template"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      padding: "18px 28px 24px",
      borderRight: "1px solid var(--border-subtle)",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Overline, null, "Template"), /*#__PURE__*/React.createElement(TemplateEditor, {
    value: text,
    onChange: setText
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 12px/1.2 var(--font-sans)",
      color: "var(--fg-2)",
      marginBottom: 8
    }
  }, "Available variables ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, "\xB7 click to insert")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, vars.map(v => /*#__PURE__*/React.createElement(Tag, {
    key: v,
    mono: true,
    tone: "accent",
    onClick: () => insert("{" + v + "}")
  }, "{" + v + "}"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      padding: "18px 28px 24px",
      background: "var(--surface-sunken)",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Overline, null, "Preview"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-meta)",
      color: "var(--fg-3)"
    }
  }, "Filled with sample notes")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement(DigestDocument, {
    blocks: preview,
    subject: "Daily Digest - " + DD.fmt(DD.today),
    to: DD.recipient
  })))));
}
window.TemplatesScreen = TemplatesScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/TemplatesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/daily-digest-assistant/data.js
try { (() => {
(function () {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmt = d => MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  const dict = {
    hibernate: "Hibernate",
    criteria: "Criteria",
    api: "API",
    hql: "HQL",
    jdbc: "JDBC",
    sql: "SQL",
    java: "Java",
    id: "ID",
    crud: "CRUD",
    office: "Office",
    spring: "Spring",
    postgresql: "PostgreSQL",
    vs: "vs."
  };
  const verbs = /^(worked|fixed|continued|studied|implemented|investigating|reviewed|learned|wrote|created|updated|tested|finish|continue|start|review|write|refactor|refactored|attended|set up|added)\b/i;
  function polish(line, kind) {
    let s = line.trim().replace(/^[-•*]\s*/, "");
    if (!s) return null;
    s = s.replace(/^tomorrow\s+/i, "");
    s = s.replace(/criteria query/i, "criteria API queries").replace(/duplicate result\b/i, "duplicate query results");
    const rules = [[/^continue (.+)/i, "continue work on the $1"], [/^continued (.+)/i, "continued work on the $1"], [/^still having (an )?issues? with (.+)/i, "investigating an issue with the $2"], [/^finish (.+)/i, "finish the $1"]];
    for (const [re, rep] of rules) {
      if (re.test(s)) {
        s = s.replace(re, rep);
        break;
      }
    }
    if (!verbs.test(s)) s = (kind === "topics" ? "studied " : kind === "plans" ? "continue work on " : "worked on ") + s;
    s = s.split(" ").map(w => dict[w.toLowerCase()] || w).join(" ").replace(/API API/g, "API");
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  }
  const lines = (t, k) => (t || "").split("\n").map(l => polish(l, k)).filter(Boolean);
  function buildVars(n, user, date) {
    return {
      date: fmt(date),
      name: user.name,
      role: user.role,
      tasks: [...lines(n.work, "tasks"), ...lines(n.progress, "progress").map(s => s.startsWith("Investigating") || s.startsWith("Continued") ? s : "Still working on: " + s.charAt(0).toLowerCase() + s.slice(1))],
      topics: lines(n.topics, "topics"),
      weekly_plans: lines(n.tomorrow, "plans"),
      tomorrow: lines(n.tomorrow, "plans"),
      blockers: lines(n.blockers, "tasks")
    };
  }
  function render(template, vars) {
    const blocks = [];
    let cur = null;
    template.split("\n").forEach(raw => {
      const l = raw.trim();
      if (!l || /^[─-]{3,}$/.test(l)) return;
      const v = l.match(/^\{(\w+)\}$/);
      if (v && Array.isArray(vars[v[1]])) {
        if (cur) cur.items.push(...vars[v[1]]);
        return;
      }
      if (!/[{}]/.test(l) && l === l.toUpperCase() && /[A-Z]/.test(l)) {
        cur = {
          type: "section",
          title: l,
          items: []
        };
        blocks.push(cur);
        return;
      }
      cur = null;
      blocks.push({
        type: "text",
        text: l.replace(/\{(\w+)\}/g, (m, k) => Array.isArray(vars[k]) ? vars[k].join(", ") : vars[k] ?? m)
      });
    });
    return blocks.filter(b => b.type !== "section" || b.items.length);
  }
  const template = `TASK TODAY

{tasks}

PLANS FOR THE WEEK

{weekly_plans}

TOPICS

{topics}

BLOCKERS

{blockers}

Regards,
{name}
{role}`;
  const user = {
    name: "Mark Justine Dela Cruz",
    first: "Mark",
    role: "CDP Trainee"
  };
  const today = new Date(2026, 9, 8);
  const sampleNotes = {
    work: "worked on hibernate\ncriteria query\nfixed duplicate result\ncontinued office repository",
    topics: "criteria api projections\nhql vs criteria",
    progress: "still having issue with embedded id",
    blockers: "",
    tomorrow: "tomorrow continue repository\nfinish embedded id mapping"
  };
  const emptyNotes = {
    work: "",
    topics: "",
    progress: "",
    blockers: "",
    tomorrow: ""
  };
  const past = [{
    d: 7,
    time: "5:02 PM",
    notes: {
      work: "set up hibernate.cfg.xml\nmapped employee entity\nwrote first hql query",
      topics: "sessionfactory lifecycle",
      progress: "",
      blockers: "",
      tomorrow: "criteria queries"
    }
  }, {
    d: 6,
    time: "4:59 PM",
    notes: {
      work: "finished jdbc exercises\nreviewed prepared statements",
      topics: "transactions and rollback",
      progress: "",
      blockers: "local postgresql port conflict",
      tomorrow: "start hibernate setup"
    }
  }, {
    d: 5,
    time: "5:04 PM",
    notes: {
      work: "wrote window function queries\ncreated department summary view",
      topics: "rank vs dense_rank",
      progress: "",
      blockers: "",
      tomorrow: "jdbc exercises"
    }
  }];
  const history = past.map((p, i) => {
    const date = new Date(2026, 9, p.d);
    return {
      id: "h" + i,
      date,
      dateLabel: fmt(date),
      time: p.time,
      notes: p.notes,
      blocks: render(template, buildVars(p.notes, user, date))
    };
  });
  window.DD = {
    MONTHS,
    fmt,
    polish,
    buildVars,
    render,
    template,
    user,
    today,
    sampleNotes,
    emptyNotes,
    history,
    recipient: "manager@company.com",
    zimbraUrl: "https://mail.company.local"
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/daily-digest-assistant/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Kbd = __ds_scope.Kbd;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.ConfirmDialog = __ds_scope.ConfirmDialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.DatePicker = __ds_scope.DatePicker;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.RadioCard = __ds_scope.RadioCard;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.TimePicker = __ds_scope.TimePicker;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.NotchCard = __ds_scope.NotchCard;

__ds_ns.AppSidebar = __ds_scope.AppSidebar;

__ds_ns.ConnectionStatus = __ds_scope.ConnectionStatus;

})();
