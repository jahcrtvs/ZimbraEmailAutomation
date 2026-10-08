import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Field, fieldBox } from "./Field.jsx";
export function Select({label,helper,value,options=[],onChange,disabled,style}){
  const [open,setOpen]=React.useState(false);
  const ref=React.useRef(null);
  React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[open]);
  const opts=options.map(o=>typeof o==="string"?{value:o,label:o}:o);
  const cur=opts.find(o=>o.value===value);
  return <Field label={label} helper={helper}>
    <span ref={ref} style={{position:"relative",display:"block",...style}}>
      <button type="button" disabled={disabled} onClick={()=>setOpen(!open)} style={{...fieldBox({focus:open,disabled}),width:"100%",cursor:"pointer",justifyContent:"space-between",color:"var(--fg-1)",font:"var(--text-body)"}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cur?cur.label:"Select…"}</span><Icon name="chevron-down" size={15} color="var(--fg-3)"/>
      </button>
      {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:40,padding:4,borderRadius:"var(--radius-md)",background:"var(--ink-3)",boxShadow:"var(--shadow-pop)",animation:"dd-pop var(--dur-fast) var(--ease-out)"}}>
        {opts.map(o=><div key={o.value} onMouseDown={e=>{e.preventDefault();onChange&&onChange(o.value);setOpen(false)}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:"var(--radius-xs)",font:"var(--text-body)",color:"var(--fg-1)",cursor:"pointer",background:o.value===value?"rgba(255,255,255,.06)":"transparent"}}>{o.label}{o.value===value&&<Icon name="check" size={14} color="var(--orange-500)"/>}</div>)}
      </div>}
    </span>
  </Field>;
}
