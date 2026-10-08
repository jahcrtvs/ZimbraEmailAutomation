import React from "react";
import * as DS from "../ds";
import { PageHeader, Overline, DigestDocument } from "../Shell.jsx";
import { fmtShort, dayLabel } from "@shared/time.js";
const D = () => DS;
const COLS="110px 96px 130px minmax(0,1fr) 120px 190px";
export function ScheduledScreen({s,a}){
  const {Button,StatusBadge,EmptyState}=D();
  const items=s.items.slice().sort((x,y)=>x.date-y.date);
  const active=items.filter(i=>i.status==="scheduled"||i.status==="missed"),gone=items.filter(i=>i.status==="cancelled");
  const groups={};active.forEach(i=>{const k=dayLabel(i.date,s.today);(groups[k]=groups[k]||[]).push(i);});
  const head=<div style={{display:"grid",gridTemplateColumns:COLS,gap:12,padding:"0 16px",font:"var(--text-overline)",letterSpacing:"var(--tracking-label)",textTransform:"uppercase",color:"var(--fg-3)"}}>{["Date","Time","Report","Recipient","Status",""].map((h,i)=><span key={i}>{h}</span>)}</div>;
  const row=it=>{const on=it.status==="scheduled",missed=it.status==="missed";return <div key={it.id} style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"center",padding:"14px 16px",borderRadius:"var(--radius-md)",background:"var(--surface-card)",border:"1px solid var(--border-subtle)",opacity:on||missed?1:.6}}>
    <span style={{color:"var(--fg-2)"}}>{fmtShort(it.date)}</span>
    <span style={{font:"var(--text-led-small)",color:it.id===s.curId?"var(--fg-accent)":"var(--fg-1)"}}>{it.time}</span>
    <span style={{fontWeight:500}}>Daily Digest</span>
    <span style={{color:"var(--fg-2)",overflow:"hidden",textOverflow:"ellipsis"}}>{it.to}</span>
    <span><StatusBadge size="sm" status={it.status}/></span>
    <span style={{display:"flex",gap:6,justifyContent:"flex-end"}}>{(on||missed)&&<Button size="sm" variant="outline" onClick={()=>a.setModal({t:"view",id:it.id})}>View</Button>}{on&&<><Button size="sm" variant="outline" onClick={()=>a.openSchedule(true,it.id)}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>a.setModal({t:"cancelSched",id:it.id})}>Cancel</Button></>}</span>
  </div>;};
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Scheduled"/>
    <div style={{flex:1,overflowY:"auto"}}><div style={{padding:28,display:"flex",flexDirection:"column",gap:24}}>
      {!items.length&&<EmptyState icon="clock" title="No scheduled digests." action={<Button variant="primary" onClick={a.newDigest}>New Digest</Button>}>Create a digest and schedule it for later.</EmptyState>}
      {items.length>0&&<><div style={{font:"var(--text-helper)",color:"var(--fg-3)"}}>Scheduling prepares the email in Zimbra at the set time. You review it there and press Send.</div>{head}</>}
      {Object.entries(groups).map(([g,list])=><div key={g} style={{display:"flex",flexDirection:"column",gap:8}}><Overline>{g}</Overline>{list.map(row)}</div>)}
      {gone.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}><Overline>Cancelled</Overline>{gone.map(row)}</div>}
    </div></div>
  </div>;
}
