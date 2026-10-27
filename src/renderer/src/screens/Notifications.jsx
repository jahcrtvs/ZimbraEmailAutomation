import React from "react";
import * as DS from "../ds";
import { PageHeader } from "../Shell.jsx";
const D = () => DS;
const KIND={update:{label:"Updates",icon:"download",color:"var(--status-info)"},alarm:{label:"Alarms",icon:"alarm-clock",color:"var(--orange-500)"},error:{label:"Errors",icon:"circle-alert",color:"var(--status-danger)"},reminder:{label:"Reminders",icon:"bell",color:"var(--status-success)"}};
export function NotificationsScreen({s,a}){
  const {Button,Icon,EmptyState}=D();
  const [kind,setKind]=React.useState("all");
  const list=s.notifications.filter(n=>kind==="all"||n.kind===kind);
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Notifications" right={s.notifications.length>0&&<Button variant="outline" icon="trash-2" onClick={a.clearNotifications}>Clear all</Button>}/>
    <div style={{display:"flex",gap:6,padding:"0 28px 12px"}}>
      {[["all","All"],...Object.entries(KIND).map(([k,v])=>[k,v.label])].map(([k,l])=><Button key={k} size="sm" variant={kind===k?"outline":"ghost"} onClick={()=>setKind(k)}>{l}</Button>)}
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {!list.length?<EmptyState icon="bell" title="No notifications.">Updates, alarms, errors and reminders will appear here.</EmptyState>
      :<div style={{padding:"0 28px 28px",display:"flex",flexDirection:"column",gap:8}}>
        {list.map(n=>{const k=KIND[n.kind]||KIND.reminder;return <div key={n.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 16px",borderRadius:"var(--radius-md)",background:"var(--surface-card)",border:"1px solid var(--border-subtle)"}}>
          <Icon name={k.icon} size={16} color={k.color} style={{marginTop:2}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{font:"600 13px/1.3 var(--font-sans)",color:"var(--fg-1)"}}>{n.title}</span>
              {!n.read&&<span aria-label="Unread" style={{width:7,height:7,borderRadius:"50%",background:"var(--orange-500)"}}/>}
            </div>
            {n.body&&<div style={{font:"var(--text-body)",color:"var(--fg-2)",marginTop:2,overflowWrap:"anywhere"}}>{n.body}</div>}
            <div style={{font:"var(--text-helper)",color:"var(--fg-3)",marginTop:4}}>{new Date(n.at).toLocaleString()}</div>
          </div>
          {n.kind==="update"&&<Button size="sm" variant="outline" icon="download" onClick={a.downloadUpdate}>Download</Button>}
          {n.kind==="alarm"&&<Button size="sm" variant="outline" onClick={a.newDigest}>Write digest</Button>}
        </div>;})}
      </div>}
    </div>
  </div>;
}
