import React from "react";
import { Icon } from "../core/Icon.jsx";
export function Banner({tone="warning",title,children,actions,details}){
  const [open,setOpen]=React.useState(false);
  const m={warning:["triangle-alert","var(--status-warning)","var(--tint-warning)","rgba(245,211,67,.3)"],danger:["circle-alert","var(--status-danger)","var(--tint-danger)","rgba(240,74,62,.3)"],info:["info","var(--status-info)","var(--tint-info)","rgba(45,140,255,.3)"],success:["circle-check","var(--status-success)","var(--tint-success)","rgba(126,217,87,.3)"]}[tone];
  return <div role="alert" style={{display:"flex",gap:12,padding:"14px 16px",borderRadius:"var(--radius-md)",background:m[2],border:`1px solid ${m[3]}`}}>
    <span style={{color:m[1],paddingTop:1}}><Icon name={m[0]} size={17}/></span>
    <div style={{flex:1,minWidth:0}}>
      <div style={{font:"600 14px/1.35 var(--font-sans)",color:"var(--fg-1)"}}>{title}</div>
      {children&&<div style={{font:"var(--text-body)",color:"var(--fg-2)",marginTop:4,textWrap:"pretty"}}>{children}</div>}
      {details&&<div style={{marginTop:8}}><button type="button" onClick={()=>setOpen(!open)} style={{border:0,padding:0,background:"transparent",color:"var(--fg-3)",font:"500 12px/1 var(--font-sans)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>View details<Icon name={open?"chevron-up":"chevron-down"} size={12}/></button>
        {open&&<pre style={{margin:"8px 0 0",padding:10,borderRadius:"var(--radius-sm)",background:"var(--ink-1)",color:"var(--fg-3)",font:"400 11px/1.5 var(--font-mono)",whiteSpace:"pre-wrap"}}>{details}</pre>}</div>}
      {actions&&<div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>{actions}</div>}
    </div>
  </div>;
}
