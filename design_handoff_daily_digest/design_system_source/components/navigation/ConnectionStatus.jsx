import React from "react";
export function ConnectionStatus({connected=true,label="Zimbra",onClick}){
  const [h,setH]=React.useState(false);
  return <button type="button" onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",height:30,padding:"0 10px",border:0,borderRadius:"var(--radius-sm)",background:h?"rgba(255,255,255,.04)":"transparent",color:"var(--fg-3)",font:"500 12px/1 var(--font-sans)",cursor:onClick?"pointer":"default",textAlign:"left"}}>
    <span style={{width:7,height:7,borderRadius:"50%",boxSizing:"border-box",background:connected?"var(--status-success)":"transparent",border:connected?"0":"1.5px solid var(--fg-3)"}}/>
    {label} {connected?"Connected":"Disconnected"}
  </button>;
}
