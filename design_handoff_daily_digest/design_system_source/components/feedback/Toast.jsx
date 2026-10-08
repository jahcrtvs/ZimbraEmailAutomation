import React from "react";
import { Icon } from "../core/Icon.jsx";
export function Toast({tone="success",message,action,onAction,onClose}){
  const m={success:["check","var(--status-success)"],info:["info","var(--status-info)"],danger:["circle-alert","var(--status-danger)"],warning:["triangle-alert","var(--status-warning)"]}[tone];
  return <div role="status" style={{display:"inline-flex",alignItems:"center",gap:10,minHeight:40,padding:"0 6px 0 14px",borderRadius:"var(--radius-pill)",background:"var(--ink-4)",boxShadow:"var(--shadow-pop)",color:"var(--fg-1)",font:"500 13px/1.3 var(--font-sans)",animation:"dd-pop var(--dur-base) var(--ease-out)"}}>
    <Icon name={m[0]} size={15} color={m[1]} strokeWidth={2.25}/>
    <span style={{paddingRight:action||onClose?0:8}}>{message}</span>
    {action&&<button type="button" onClick={onAction} style={{border:0,background:"transparent",color:"var(--orange-400)",font:"600 13px/1 var(--font-sans)",cursor:"pointer",padding:"0 6px"}}>{action}</button>}
    {onClose&&<button type="button" aria-label="Dismiss" onClick={onClose} style={{width:28,height:28,border:0,borderRadius:"50%",background:"transparent",color:"var(--fg-3)",display:"grid",placeItems:"center",cursor:"pointer"}}><Icon name="x" size={14}/></button>}
  </div>;
}
