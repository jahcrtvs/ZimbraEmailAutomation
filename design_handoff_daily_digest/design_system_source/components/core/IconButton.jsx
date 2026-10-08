import React from "react";
import { Icon } from "./Icon.jsx";
export function IconButton({icon,variant="ghost",size=32,dot,label,onClick,active,style}){
  const [hover,setHover]=React.useState(false);
  const v={
    ghost:{bg:hover?"rgba(255,255,255,.07)":"transparent",fg:hover?"var(--fg-1)":"var(--fg-2)",bd:"transparent"},
    outline:{bg:hover?"rgba(255,255,255,.07)":"transparent",fg:"var(--fg-1)",bd:"var(--border-default)"},
    filled:{bg:hover?"var(--ink-5)":"var(--ink-4)",fg:"var(--fg-1)",bd:"transparent"},
    inverse:{bg:"var(--surface-inverse)",fg:"var(--fg-on-inverse)",bd:"transparent"}
  }[active?"inverse":variant];
  return <button type="button" aria-label={label||icon} title={label} onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    style={{position:"relative",width:size,height:size,borderRadius:"50%",border:`1px solid ${v.bd}`,background:v.bg,color:v.fg,display:"grid",placeItems:"center",cursor:"pointer",padding:0,transition:"background var(--dur-fast)",flexShrink:0,...style}}>
    <Icon name={icon} size={Math.round(size*.5)}/>
    {dot&&<span style={{position:"absolute",top:size*.18,right:size*.18,width:7,height:7,borderRadius:"50%",background:dot===true?"var(--orange-500)":dot}}/>}
  </button>;
}
