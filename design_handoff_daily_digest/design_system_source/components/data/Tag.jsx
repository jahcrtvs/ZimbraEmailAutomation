import React from "react";
export function Tag({children,mono,tone="neutral",onClick,style}){
  const accent=tone==="accent";
  return <span onClick={onClick} style={{display:"inline-flex",alignItems:"center",height:22,padding:"0 8px",borderRadius:"var(--radius-xs)",background:accent?"var(--tint-accent)":"var(--ink-4)",color:accent?"var(--orange-400)":"var(--fg-2)",font:mono?"500 12px/1 var(--font-mono)":"500 12px/1 var(--font-sans)",cursor:onClick?"pointer":"default",...style}}>{children}</span>;
}
