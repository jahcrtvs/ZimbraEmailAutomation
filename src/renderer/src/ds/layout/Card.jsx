import React from "react";
export function Card({title,subtitle,actions,children,padding=20,onClick,selected,style}){
  const [h,setH]=React.useState(false);
  return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{borderRadius:"var(--radius-md)",background:onClick&&h?"var(--surface-card-hover)":"var(--surface-card)",border:`1px solid ${selected?"var(--border-accent)":"var(--border-subtle)"}`,cursor:onClick?"pointer":"default",transition:"background var(--dur-fast)",overflow:"hidden",...style}}>
    {(title||actions)&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:`12px ${padding}px`,background:"var(--surface-card-header)",borderBottom:"1px solid var(--border-subtle)"}}>
      <div><div style={{font:"var(--text-section)",color:"var(--fg-1)"}}>{title}</div>{subtitle&&<div style={{font:"var(--text-meta)",color:"var(--fg-3)",marginTop:3}}>{subtitle}</div>}</div>
      {actions&&<div style={{display:"flex",gap:8,alignItems:"center"}}>{actions}</div>}
    </div>}
    <div style={{padding}}>{children}</div>
  </div>;
}
