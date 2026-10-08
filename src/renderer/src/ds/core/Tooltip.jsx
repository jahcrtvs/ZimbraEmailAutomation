import React from "react";
import { Kbd } from "./Kbd.jsx";
export function Tooltip({label,kbd,side="top",children}){
  const [open,setOpen]=React.useState(false);
  const pos=side==="bottom"?{top:"calc(100% + 6px)"}:side==="right"?{left:"calc(100% + 8px)",top:"50%",transform:"translateY(-50%)"}:{bottom:"calc(100% + 6px)"};
  return <span style={{position:"relative",display:"inline-flex"}} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}>
    {children}
    {open&&<span role="tooltip" style={{position:"absolute",...(side==="right"?{}:{left:"50%",transform:"translateX(-50%)"}),...pos,zIndex:50,display:"inline-flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:"var(--radius-sm)",background:"var(--ink-5)",color:"var(--fg-1)",font:"500 12px/1 var(--font-sans)",whiteSpace:"nowrap",boxShadow:"var(--shadow-pop)",pointerEvents:"none"}}>{label}{kbd&&<Kbd>{kbd}</Kbd>}</span>}
  </span>;
}
