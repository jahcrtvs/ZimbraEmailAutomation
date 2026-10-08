import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Kbd } from "../core/Kbd.jsx";
import { Badge } from "../data/Badge.jsx";
import { ConnectionStatus } from "./ConnectionStatus.jsx";
function NavItem({item,active,onClick}){
  const [h,setH]=React.useState(false);
  return <button type="button" onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"flex",alignItems:"center",gap:10,height:32,padding:"0 10px",border:0,borderRadius:"var(--radius-sm)",background:active?"var(--ink-4)":h?"rgba(255,255,255,.04)":"transparent",color:active?"var(--fg-1)":"var(--fg-2)",font:`${active?600:500} 13px/1 var(--font-sans)`,cursor:"pointer",textAlign:"left",width:"100%"}}>
    <Icon name={item.icon} size={16} color={active?"var(--orange-500)":"currentColor"}/>
    <span style={{flex:1}}>{item.label}</span>
    {item.count?<Badge tone={item.countTone||"neutral"}>{item.count}</Badge>:item.kbd&&h?<Kbd>{item.kbd}</Kbd>:null}
  </button>;
}
export function AppSidebar({items=[],value,onChange,connected=true,onConnectionClick,footer}){
  return <nav style={{display:"flex",flexDirection:"column",width:"var(--sidebar-width)",height:"100%",boxSizing:"border-box",padding:"12px 10px",background:"var(--surface-sidebar)",borderRight:"1px solid var(--border-subtle)"}}>
    <div style={{display:"flex",flexDirection:"column",gap:2}}>{items.map(it=><NavItem key={it.id} item={it} active={it.id===value} onClick={()=>onChange&&onChange(it.id)}/>)}</div>
    <div style={{flex:1}}/>
    {footer}
    <div style={{borderTop:"1px solid var(--border-subtle)",paddingTop:10,marginTop:10}}><ConnectionStatus connected={connected} onClick={onConnectionClick}/></div>
  </nav>;
}
