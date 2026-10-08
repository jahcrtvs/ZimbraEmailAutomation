import React from "react";
import { Icon } from "../core/Icon.jsx";
export function Checkbox({checked,onChange,label}){
  return <label onClick={()=>onChange&&onChange(!checked)} style={{display:"inline-flex",alignItems:"center",gap:10,cursor:"pointer",font:"var(--text-body)",color:"var(--fg-1)"}}>
    <span style={{width:16,height:16,borderRadius:5,display:"grid",placeItems:"center",background:checked?"var(--surface-accent)":"transparent",border:`1px solid ${checked?"transparent":"var(--border-strong)"}`,color:"var(--ink-1)"}}>{checked&&<Icon name="check" size={11} strokeWidth={3}/>}</span>{label}
  </label>;
}
