import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Field, fieldBox } from "./Field.jsx";
function slots(step){const out=[];for(let m=7*60;m<=21*60;m+=step){const h=Math.floor(m/60),mm=m%60;const h12=((h+11)%12)+1;out.push(h12+":"+String(mm).padStart(2,"0")+" "+(h<12?"AM":"PM"));}return out;}
export function TimePicker({label,helper,value="5:00 PM",onChange,step=15,style}){
  const [open,setOpen]=React.useState(false);const ref=React.useRef(null);const list=React.useRef(null);
  React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);
    const el=list.current&&list.current.querySelector("[data-sel]");if(el)list.current.scrollTop=el.offsetTop-80;
    return()=>document.removeEventListener("mousedown",h)},[open]);
  return <Field label={label} helper={helper}>
    <span ref={ref} style={{position:"relative",display:"block",...style}}>
      <button type="button" onClick={()=>setOpen(!open)} style={{...fieldBox({focus:open}),width:"100%",cursor:"pointer",color:"var(--fg-1)",font:"var(--text-body)"}}>
        <Icon name="clock" size={15} color="var(--fg-3)"/><span style={{flex:1,textAlign:"left"}}>{value}</span><Icon name="chevron-down" size={15} color="var(--fg-3)"/>
      </button>
      {open&&<div ref={list} style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:40,maxHeight:208,overflowY:"auto",padding:4,borderRadius:"var(--radius-md)",background:"var(--ink-3)",boxShadow:"var(--shadow-pop)",animation:"dd-pop var(--dur-fast) var(--ease-out)"}}>
        {slots(step).map(t=><div key={t} data-sel={t===value?"":undefined} onMouseDown={e=>{e.preventDefault();onChange&&onChange(t);setOpen(false)}} style={{padding:"7px 10px",borderRadius:"var(--radius-xs)",font:"var(--text-body)",fontVariantNumeric:"tabular-nums",color:t===value?"var(--orange-500)":"var(--fg-1)",background:t===value?"var(--tint-accent)":"transparent",cursor:"pointer"}}>{t}</div>)}
      </div>}
    </span>
  </Field>;
}
