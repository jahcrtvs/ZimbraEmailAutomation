import React from "react";
export function Badge({children,tone="neutral",style}){
  const m={accent:["var(--tint-accent)","var(--orange-500)"],neutral:["var(--tint-neutral)","var(--fg-2)"],success:["var(--tint-success)","var(--status-success)"],danger:["var(--tint-danger)","var(--status-danger)"],info:["var(--tint-info)","var(--status-info)"]}[tone];
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:18,height:18,padding:"0 6px",boxSizing:"border-box",borderRadius:"var(--radius-pill)",background:m[0],color:m[1],font:"600 11px/1 var(--font-sans)",...style}}>{children}</span>;
}
