import React from "react";
import { Icon } from "./Icon.jsx";
import { Kbd } from "./Kbd.jsx";
const sizes={sm:{h:28,px:12,fs:12,ic:14},md:{h:36,px:14,fs:13,ic:16},lg:{h:40,px:18,fs:14,ic:16}};
const variants={
  primary:{bg:"var(--surface-accent)",fg:"var(--fg-on-accent)",bd:"transparent",hbg:"var(--orange-400)",abg:"var(--orange-600)"},
  inverse:{bg:"var(--surface-inverse)",fg:"var(--fg-on-inverse)",bd:"transparent",hbg:"var(--paper-1)",abg:"var(--paper-2)"},
  secondary:{bg:"var(--ink-4)",fg:"var(--fg-1)",bd:"var(--border-subtle)",hbg:"var(--ink-5)",abg:"var(--ink-6)"},
  outline:{bg:"transparent",fg:"var(--fg-1)",bd:"var(--border-default)",hbg:"rgba(255,255,255,.06)",abg:"rgba(255,255,255,.1)"},
  ghost:{bg:"transparent",fg:"var(--fg-2)",bd:"transparent",hbg:"rgba(255,255,255,.06)",abg:"rgba(255,255,255,.1)"},
  danger:{bg:"transparent",fg:"var(--status-danger)",bd:"rgba(240,74,62,.4)",hbg:"var(--tint-danger)",abg:"rgba(240,74,62,.22)"}
};
export function Button({variant="secondary",size="md",icon,iconRight,loading,disabled,kbd,full,type="button",children,onClick,style}){
  const [hover,setHover]=React.useState(false);const [down,setDown]=React.useState(false);
  const s=sizes[size]||sizes.md;const v=variants[variant]||variants.secondary;const off=disabled||loading;
  const bg=off?v.bg:down?v.abg:hover?v.hbg:v.bg;
  return <button type={type} disabled={off} onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>{setHover(false);setDown(false)}} onMouseDown={()=>setDown(true)} onMouseUp={()=>setDown(false)}
    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,height:s.h,padding:`0 ${s.px}px`,width:full?"100%":undefined,borderRadius:"var(--radius-pill)",border:`1px solid ${v.bd}`,background:bg,color:v.fg,font:`500 ${s.fs}px/1 var(--font-sans)`,cursor:disabled?"not-allowed":loading?"progress":"pointer",opacity:disabled?.4:1,transform:down&&!off?"scale(.97)":"none",transition:"background var(--dur-fast), transform var(--dur-fast)",whiteSpace:"nowrap",boxSizing:"border-box",...style}}>
    {loading?<span style={{display:"flex",animation:"dd-spin .8s linear infinite"}}><Icon name="loader-circle" size={s.ic}/></span>:icon&&<Icon name={icon} size={s.ic}/>}
    {children}
    {iconRight&&!loading&&<Icon name={iconRight} size={s.ic}/>}
    {kbd&&<Kbd tone={variant==="primary"||variant==="inverse"?"onLight":"default"}>{kbd}</Kbd>}
  </button>;
}
