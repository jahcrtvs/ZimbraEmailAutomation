import React from "react";
export function RadioCard({checked,onChange,title,description,badge,tone}){
  const [h,setH]=React.useState(false);
  const warn=tone==="warning"&&checked;
  return <div role="radio" aria-checked={!!checked} onClick={()=>onChange&&onChange()} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:"var(--radius-md)",cursor:"pointer",background:checked?(warn?"var(--tint-warning)":"var(--tint-accent)"):h?"rgba(255,255,255,.03)":"transparent",border:`1px solid ${checked?(warn?"rgba(245,211,67,.45)":"rgba(246,162,58,.5)"):"var(--border-default)"}`,transition:"background var(--dur-fast)"}}>
    <span style={{marginTop:2,width:16,height:16,flexShrink:0,borderRadius:"50%",border:`1.5px solid ${checked?(warn?"var(--status-warning)":"var(--orange-500)"):"var(--border-strong)"}`,display:"grid",placeItems:"center"}}>{checked&&<span style={{width:8,height:8,borderRadius:"50%",background:warn?"var(--status-warning)":"var(--orange-500)"}}/>}</span>
    <span style={{display:"flex",flexDirection:"column",gap:3}}>
      <span style={{display:"flex",alignItems:"center",gap:8,font:"500 14px/1.3 var(--font-sans)",color:"var(--fg-1)"}}>{title}{badge&&<span style={{font:"500 11px/1 var(--font-sans)",color:"var(--fg-3)"}}>{badge}</span>}</span>
      {description&&<span style={{font:"var(--text-helper)",color:"var(--fg-3)"}}>{description}</span>}
    </span>
  </div>;
}
