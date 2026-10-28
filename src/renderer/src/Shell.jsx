import React from "react";
import { IconButton } from "./ds";

export function PageHeader({title,meta,right,onBack}){
  return <div style={{display:"flex",alignItems:"center",gap:12,height:64,padding:"0 28px",flexShrink:0}}>
    {onBack&&<IconButton icon="arrow-left" label="Back" onClick={onBack}/>}
    <h1 style={{margin:0,font:"var(--text-page-title)"}}>{title}</h1>
    {meta&&<span style={{font:"var(--text-meta)",color:"var(--fg-3)"}}>{meta}</span>}
    <div style={{flex:1}}/>{right}
  </div>;
}
export function Overline({children,style}){return <div style={{font:"var(--text-overline)",letterSpacing:"var(--tracking-label)",textTransform:"uppercase",color:"var(--fg-3)",...style}}>{children}</div>;}
export function DigestDocument({blocks,subject,to,editing,draft,setDraft,dim}){
  return <div style={{background:"var(--surface-document)",color:"var(--fg-document)",borderRadius:"var(--radius-md)",overflow:"hidden",opacity:dim?.55:1,transition:"opacity var(--dur-base)"}}>
    <div style={{padding:"12px 28px",background:"#f4f4f4",borderBottom:"1px solid #e6e6e6",display:"grid",gridTemplateColumns:"64px minmax(0,1fr)",rowGap:6,font:"400 13px/1.3 var(--font-sans)",overflowWrap:"anywhere"}}>
      <span style={{color:"var(--fg-document-muted)"}}>To</span><span>{to}</span>
      <span style={{color:"var(--fg-document-muted)"}}>Subject</span><span style={{fontWeight:600}}>{subject}</span>
    </div>
    <div style={{padding:"24px 28px 28px",display:"flex",flexDirection:"column",gap:4,font:"400 14px/1.6 var(--font-sans)",overflowWrap:"anywhere"}}>
      {blocks.map((b,i)=>b.type==="section"?<div key={i} style={{marginBottom:16}}>
        <div style={{font:"700 12px/1 var(--font-sans)",letterSpacing:".06em",marginBottom:8}}>{b.title}</div>
        {editing?<textarea value={draft[i]} onChange={e=>setDraft({...draft,[i]:e.target.value})} rows={Math.max(2,(draft[i]||"").split("\n").length)} style={{width:"100%",boxSizing:"border-box",resize:"vertical",border:"1px solid #d7d7d7",borderRadius:8,padding:"8px 10px",font:"400 14px/1.6 var(--font-sans)",color:"var(--fg-document)",background:"#fffdf8",outline:"none",boxShadow:"0 0 0 3px rgba(246,162,58,.18)"}}/>
        :<ul style={{margin:0,paddingLeft:20}}>{b.items.map((it,k)=><li key={k}>{it}</li>)}</ul>}
      </div>:<div key={i} style={{color:"var(--fg-document)"}}>{b.text}</div>)}
    </div>
  </div>;
}
