import React from "react";
import { Icon } from "../core/Icon.jsx";
export function EmptyState({icon="inbox",title,children,action}){
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:8,padding:"40px 24px"}}>
    <span style={{width:44,height:44,borderRadius:"50%",border:"1px dashed var(--border-strong)",display:"grid",placeItems:"center",color:"var(--fg-3)",marginBottom:6}}><Icon name={icon} size={20}/></span>
    <div style={{font:"600 15px/1.3 var(--font-sans)",color:"var(--fg-1)"}}>{title}</div>
    {children&&<div style={{font:"var(--text-body)",color:"var(--fg-3)",maxWidth:300,textWrap:"pretty"}}>{children}</div>}
    {action&&<div style={{marginTop:10}}>{action}</div>}
  </div>;
}
