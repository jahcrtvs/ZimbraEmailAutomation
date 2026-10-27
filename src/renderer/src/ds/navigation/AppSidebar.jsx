import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Kbd } from "../core/Kbd.jsx";
import { Badge } from "../data/Badge.jsx";
import { ConnectionStatus } from "./ConnectionStatus.jsx";
function NavItem({item,active,onClick}){
  const [h,setH]=React.useState(false);
  return <button type="button" onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"flex",alignItems:"center",gap:10,height:36,padding:"0 10px",border:`1px solid ${active?"var(--border-subtle)":"transparent"}`,borderRadius:"var(--radius-sm)",background:active?"var(--ink-3)":h?"rgba(255,255,255,.04)":"transparent",color:active?"var(--fg-1)":"var(--fg-2)",font:`${active?600:500} 13px/1 var(--font-sans)`,cursor:"pointer",textAlign:"left",width:"100%"}}>
    <Icon name={item.icon} size={16} color={active?"var(--orange-500)":"currentColor"}/>
    <span style={{flex:1}}>{item.label}</span>
    {item.count?<Badge tone={item.countTone||"neutral"}>{item.count}</Badge>:item.kbd&&h?<Kbd>{item.kbd}</Kbd>:null}
  </button>;
}
export function AppSidebar({items=[],value,onChange,connected=true,onConnectionClick,footer}){
  return <nav style={{display:"flex",flexDirection:"column",width:"var(--sidebar-width)",height:"100%",boxSizing:"border-box",padding:"8px 10px 10px",background:"var(--surface-sidebar)"}}>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>{items.map(it=><NavItem key={it.id} item={it} active={it.id===value} onClick={()=>onChange&&onChange(it.id)}/>)}</div>
    <div style={{flex:1}}/>
    {footer}
    <div style={{marginTop:10,padding:"10px 8px",borderRadius:"var(--radius-md)",background:"var(--ink-2)",border:"1px solid var(--border-subtle)"}}><ConnectionStatus connected={connected} onClick={onConnectionClick}/></div>
  </nav>;
}
