import React from "react";
import { Icon } from "../core/Icon.jsx";
const M={
  none:{l:"Not started",c:"var(--fg-3)",b:"var(--tint-neutral)",dot:"hollow"},
  draft:{l:"Draft",c:"var(--fg-2)",b:"var(--tint-neutral)"},
  generating:{l:"Generating",c:"var(--status-info)",b:"var(--tint-info)",pulse:true},
  ready:{l:"Ready for Review",c:"var(--orange-500)",b:"var(--tint-accent)"},
  scheduled:{l:"Scheduled",c:"var(--status-info)",b:"var(--tint-info)",icon:"clock"},
  sending:{l:"Sending",c:"var(--status-info)",b:"var(--tint-info)",pulse:true},
  sent:{l:"Sent",c:"var(--status-success)",b:"var(--tint-success)",icon:"check"},
  failed:{l:"Failed",c:"var(--status-danger)",b:"var(--tint-danger)",icon:"circle-alert"},
  cancelled:{l:"Cancelled",c:"var(--fg-3)",b:"var(--tint-neutral)",icon:"ban"},
  missed:{l:"Missed",c:"var(--status-warning)",b:"var(--tint-warning)",icon:"triangle-alert"}
};
export function StatusBadge({status="draft",label,detail,size="md"}){
  const m=M[status]||M.draft;const h=size==="sm"?20:24;
  return <span style={{display:"inline-flex",alignItems:"center",gap:6,height:h,padding:"0 9px 0 8px",borderRadius:"var(--radius-pill)",background:m.b,color:m.c,font:`500 ${size==="sm"?11:12}px/1 var(--font-sans)`,whiteSpace:"nowrap"}}>
    {m.icon?<Icon name={m.icon} size={12} strokeWidth={2.25}/>:<span style={{width:6,height:6,borderRadius:"50%",background:m.dot==="hollow"?"transparent":m.c,border:m.dot==="hollow"?`1.5px solid ${m.c}`:"0",animation:m.pulse?"dd-pulse 1.2s ease-in-out infinite":"none"}}/>}
    {label||m.l}{detail&&<span style={{opacity:.8}}>· {detail}</span>}
  </span>;
}
