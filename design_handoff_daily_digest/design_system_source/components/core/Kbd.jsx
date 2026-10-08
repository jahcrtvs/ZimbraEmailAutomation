import React from "react";
export function Kbd({children,tone="default"}){
  const light=tone==="onLight";
  return <kbd style={{display:"inline-flex",alignItems:"center",height:18,padding:"0 5px",borderRadius:5,font:"500 11px/1 var(--font-sans)",background:light?"rgba(0,0,0,.12)":"rgba(255,255,255,.08)",color:light?"inherit":"var(--fg-3)",border:light?"0":"1px solid var(--border-subtle)",opacity:light?.75:1}}>{children}</kbd>;
}
