import React from "react";
export function Switch({checked,onChange,label,disabled}){
  return <label style={{display:"inline-flex",alignItems:"center",gap:10,cursor:disabled?"default":"pointer",font:"var(--text-body)",color:"var(--fg-1)",opacity:disabled?.5:1}}>
    <span role="switch" aria-checked={!!checked} onClick={()=>!disabled&&onChange&&onChange(!checked)} style={{position:"relative",width:34,height:20,flexShrink:0,borderRadius:"var(--radius-pill)",background:checked?"var(--surface-accent)":"var(--ink-5)",transition:"background var(--dur-base) var(--ease-out)"}}>
      <span style={{position:"absolute",top:3,left:checked?17:3,width:14,height:14,borderRadius:"50%",background:checked?"var(--ink-1)":"var(--grey-1)",transition:"left var(--dur-base) var(--ease-out)"}}/>
    </span>{label}
  </label>;
}
