import React from "react";
export function Field({label,helper,error,hint,children}){
  return <label style={{display:"flex",flexDirection:"column",gap:6,minWidth:0}}>
    {(label||hint)&&<span style={{display:"flex",justifyContent:"space-between",gap:8,font:"500 12px/1.2 var(--font-sans)",color:"var(--fg-2)"}}>{label}{hint&&<span style={{color:"var(--fg-3)",fontWeight:400}}>{hint}</span>}</span>}
    {children}
    {(error||helper)&&<span style={{font:"var(--text-helper)",color:error?"var(--status-danger)":"var(--fg-3)"}}>{error||helper}</span>}
  </label>;
}
export function fieldBox({focus,error,disabled}){
  return {display:"flex",alignItems:"center",gap:8,minHeight:36,padding:"0 12px",boxSizing:"border-box",borderRadius:"var(--radius-sm)",background:disabled?"transparent":"var(--surface-field)",border:`1px solid ${error?"var(--status-danger)":focus?"var(--border-accent)":"var(--border-default)"}`,boxShadow:focus&&!error?"var(--focus-ring)":"none",color:"var(--fg-3)",opacity:disabled?.5:1,transition:"border-color var(--dur-fast), box-shadow var(--dur-fast)"};
}
