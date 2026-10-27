import React from "react";
import * as DS from "../ds";
import { PageHeader, Overline, DigestDocument } from "../Shell.jsx";
import { fmtShort, dayLabel } from "@shared/time.js";
const D = () => DS;
const HCOLS="90px 110px minmax(0,1fr) 100px 150px";
// Several recipients do not fit one line; cut them and show the full list on hover.
const clip={minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
export function HistoryScreen({s,a}){
  const {Button,StatusBadge,EmptyState}=D();
  const rcpt=h=>h.to||s.settings.email.defaultRecipient;const sel=s.history.find(h=>h.id===s.historySel);
  if(!s.history.length)return <div style={{flex:1,display:"flex",flexDirection:"column"}}><PageHeader title="History"/><EmptyState icon="history" title="No previous digests yet.">Your completed digests will appear here.</EmptyState></div>;
  if(sel)return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title={"Daily Digest · "+sel.dateLabel} onBack={()=>a.selectHistory(null)} right={<div style={{display:"flex",gap:10,alignItems:"center"}}><StatusBadge status={sel.status} detail={sel.time}/><Button variant="primary" icon="copy" onClick={()=>a.duplicate(sel)}>Duplicate</Button></div>}/>
    <div style={{flex:1,overflowY:"auto",background:"var(--surface-sunken)",padding:"20px 28px"}}><div style={{maxWidth:760}}><DigestDocument blocks={sel.blocks} subject={"Daily Digest - "+sel.dateLabel} to={rcpt(sel)}/></div></div>
  </div>;
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="History"/>
    <div style={{flex:1,overflowY:"auto"}}><div style={{padding:"4px 28px 28px",display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"grid",gridTemplateColumns:HCOLS,gap:12,padding:"0 16px 4px",font:"var(--text-overline)",letterSpacing:"var(--tracking-label)",textTransform:"uppercase",color:"var(--fg-3)"}}>{["Date","Subject","Recipient","Status",""].map((h,i)=><span key={i}>{h}</span>)}</div>
      {s.history.map(h=><div key={h.id} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")a.selectHistory(h.id);}} onClick={()=>a.selectHistory(h.id)} className="hrow" style={{display:"grid",gridTemplateColumns:HCOLS,gap:12,alignItems:"center",padding:"12px 16px",borderRadius:"var(--radius-md)",background:"var(--surface-card)",border:"1px solid var(--border-subtle)",cursor:"pointer"}}>
        <span>{fmtShort(h.date)}</span><span style={{fontWeight:500,...clip}}>Daily Digest</span><span title={rcpt(h)} style={{color:"var(--fg-2)",...clip}}>{rcpt(h)}</span>
        <span><StatusBadge size="sm" status={h.status}/></span>
        <span style={{display:"flex",gap:6,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}><Button size="sm" variant="outline" onClick={()=>a.selectHistory(h.id)}>View</Button><Button size="sm" variant="ghost" onClick={()=>a.duplicate(h)}>Duplicate</Button></span>
      </div>)}
    </div></div>
  </div>;
}

