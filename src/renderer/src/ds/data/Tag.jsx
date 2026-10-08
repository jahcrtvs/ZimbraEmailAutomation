import React from "react";
export function Tag({children,mono,tone="neutral",onClick,style}){
  const accent=tone==="accent";
  const s={display:"inline-flex",alignItems:"center",height:22,padding:"0 8px",borderRadius:"var(--radius-xs)",background:accent?"var(--tint-accent)":"var(--ink-4)",color:accent?"var(--orange-400)":"var(--fg-2)",font:mono?"500 12px/1 var(--font-mono)":"500 12px/1 var(--font-sans)",cursor:onClick?"pointer":"default",...style};
  if(onClick)return <button type="button" onClick={onClick} style={{border:0,margin:0,boxSizing:"border-box",...s}}>{children}</button>;
  return <span style={s}>{children}</span>;
}
