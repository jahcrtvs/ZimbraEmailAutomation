import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Field, fieldBox } from "./Field.jsx";
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
export function formatDate(d){return MONTHS[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();}
export function DatePicker({label,helper,value,onChange,minDate,style}){
  const [open,setOpen]=React.useState(false);
  const d=value||new Date();const [view,setView]=React.useState(new Date(d.getFullYear(),d.getMonth(),1));
  const ref=React.useRef(null);
  React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[open]);
  const first=(view.getDay()+6)%7, days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  const cells=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  const same=(a,b)=>a&&b&&a.toDateString()===b.toDateString();
  const today=new Date();
  return <Field label={label} helper={helper}>
    <span ref={ref} style={{position:"relative",display:"block",...style}}>
      <button type="button" onClick={()=>setOpen(!open)} style={{...fieldBox({focus:open}),width:"100%",cursor:"pointer",color:"var(--fg-1)",font:"var(--text-body)"}}>
        <Icon name="calendar" size={15} color="var(--fg-3)"/><span style={{flex:1,textAlign:"left"}}>{formatDate(d)}</span><Icon name="chevron-down" size={15} color="var(--fg-3)"/>
      </button>
      {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:40,width:252,padding:12,borderRadius:"var(--radius-md)",background:"var(--ink-3)",boxShadow:"var(--shadow-pop)",animation:"dd-pop var(--dur-fast) var(--ease-out)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,font:"600 13px/1 var(--font-sans)",color:"var(--fg-1)"}}>
          <button type="button" onClick={()=>setView(new Date(view.getFullYear(),view.getMonth()-1,1))} style={navBtn}><Icon name="chevron-left" size={15}/></button>
          {MONTHS[view.getMonth()]} {view.getFullYear()}
          <button type="button" onClick={()=>setView(new Date(view.getFullYear(),view.getMonth()+1,1))} style={navBtn}><Icon name="chevron-right" size={15}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center"}}>
          {["M","T","W","T","F","S","S"].map((w,i)=><span key={i} style={{font:"500 11px/24px var(--font-sans)",color:"var(--fg-3)"}}>{w}</span>)}
          {cells.map((n,i)=>{if(!n)return <span key={i}/>;const cd=new Date(view.getFullYear(),view.getMonth(),n);const sel=same(cd,d);const dis=minDate&&cd<new Date(minDate.toDateString());
            return <button type="button" key={i} disabled={dis} onClick={()=>{onChange&&onChange(cd);setOpen(false)}} style={{height:30,border:same(cd,today)&&!sel?"1px solid var(--border-strong)":"1px solid transparent",borderRadius:"50%",background:sel?"var(--surface-accent)":"transparent",color:sel?"var(--fg-on-accent)":dis?"var(--fg-3)":"var(--fg-1)",opacity:dis?.4:1,font:"500 12px/1 var(--font-sans)",cursor:dis?"default":"pointer"}}>{n}</button>})}
        </div>
      </div>}
    </span>
  </Field>;
}
const navBtn={width:26,height:26,borderRadius:"50%",border:0,background:"transparent",color:"var(--fg-2)",display:"grid",placeItems:"center",cursor:"pointer"};
