const dayLabel=d=>{const diff=Math.round((d-DD.today)/864e5);return diff===0?"Today":diff===1?"Tomorrow":DD.MONTHS[d.getMonth()].slice(0,3)+" "+d.getDate();};
const COLS="110px 96px 130px minmax(0,1fr) 120px 190px";
function ScheduledScreen({s,a}){
  const {Button,StatusBadge,EmptyState}=D();
  const items=s.items.slice().sort((x,y)=>x.date-y.date);
  const active=items.filter(i=>i.status==="scheduled"),gone=items.filter(i=>i.status!=="scheduled");
  const groups={};active.forEach(i=>{(groups[dayLabel(i.date)]=groups[dayLabel(i.date)]||[]).push(i);});
  const head=<div style={{display:"grid",gridTemplateColumns:COLS,gap:12,padding:"0 16px",font:"var(--text-overline)",letterSpacing:"var(--tracking-label)",textTransform:"uppercase",color:"var(--fg-3)"}}>{["Date","Time","Report","Recipient","Status",""].map((h,i)=><span key={i}>{h}</span>)}</div>;
  const row=it=>{const on=it.status==="scheduled";return <div key={it.id} style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"center",padding:"14px 16px",borderRadius:"var(--radius-md)",background:"var(--surface-card)",border:"1px solid var(--border-subtle)",opacity:on?1:.6}}>
    <span style={{color:"var(--fg-2)"}}>{DD.MONTHS[it.date.getMonth()].slice(0,3)+" "+it.date.getDate()}</span>
    <span style={{font:"var(--text-led-small)",color:on&&it.id==="cur"?"var(--fg-accent)":"var(--fg-1)"}}>{it.time}</span>
    <span style={{fontWeight:500}}>Daily Digest</span>
    <span style={{color:"var(--fg-2)",overflow:"hidden",textOverflow:"ellipsis"}}>{it.to}</span>
    <span><StatusBadge size="sm" status={on?"scheduled":"cancelled"}/></span>
    <span style={{display:"flex",gap:6,justifyContent:"flex-end"}}>{on&&<><Button size="sm" variant="outline" onClick={()=>a.setModal({t:"view",id:it.id})}>View</Button><Button size="sm" variant="outline" onClick={()=>a.openSchedule(true,it.id)}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>a.setModal({t:"cancelSched",id:it.id})}>Cancel</Button></>}</span>
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
const HCOLS="130px minmax(0,1fr) 200px 130px 150px";
function HistoryScreen({s,a}){
  const {Button,StatusBadge,EmptyState}=D();
  const sel=s.history.find(h=>h.id===s.historySel);
  if(!s.history.length)return <div style={{flex:1,display:"flex",flexDirection:"column"}}><PageHeader title="History"/><EmptyState icon="history" title="No previous digests yet.">Your completed digests will appear here.</EmptyState></div>;
  if(sel)return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title={"Daily Digest · "+sel.dateLabel} onBack={()=>a.selectHistory(null)} right={<div style={{display:"flex",gap:10,alignItems:"center"}}><StatusBadge status={sel.status} detail={sel.time}/><Button variant="primary" icon="copy" onClick={()=>a.duplicate(sel)}>Duplicate</Button></div>}/>
    <div style={{flex:1,overflowY:"auto",background:"var(--surface-sunken)",padding:"20px 28px"}}><div style={{maxWidth:760}}><DigestDocument blocks={sel.blocks} subject={"Daily Digest - "+sel.dateLabel} to={DD.recipient}/></div></div>
  </div>;
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="History"/>
    <div style={{flex:1,overflowY:"auto"}}><div style={{padding:28,display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"grid",gridTemplateColumns:HCOLS,gap:12,padding:"0 16px 4px",font:"var(--text-overline)",letterSpacing:"var(--tracking-label)",textTransform:"uppercase",color:"var(--fg-3)"}}>{["Date","Subject","Recipient","Status",""].map((h,i)=><span key={i}>{h}</span>)}</div>
      {s.history.map(h=><div key={h.id} onClick={()=>a.selectHistory(h.id)} className="hrow" style={{display:"grid",gridTemplateColumns:HCOLS,gap:12,alignItems:"center",padding:"12px 16px",borderRadius:"var(--radius-md)",background:"var(--surface-card)",border:"1px solid var(--border-subtle)",cursor:"pointer"}}>
        <span>{DD.MONTHS[h.date.getMonth()].slice(0,3)+" "+h.date.getDate()}</span><span style={{fontWeight:500}}>Daily Digest</span><span style={{color:"var(--fg-2)"}}>{DD.recipient}</span>
        <span><StatusBadge size="sm" status={h.status}/></span>
        <span style={{display:"flex",gap:6,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}><Button size="sm" variant="outline" onClick={()=>a.selectHistory(h.id)}>View</Button><Button size="sm" variant="ghost" onClick={()=>a.duplicate(h)}>Duplicate</Button></span>
      </div>)}
    </div></div>
  </div>;
}
function SettingsScreen({s,a}){
  const {Card,Button,Input,Select,TimePicker,StatusBadge,Banner}=D();
  const [p,setP]=React.useState({name:DD.user.name,role:DD.user.role,to:DD.recipient,subject:"Daily Digest - {date}",time:"5:00 PM",model:"flash",url:DD.zimbraUrl});
  const set=k=>v=>setP({...p,[k]:v});const row={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14};
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Settings" right={<Button variant="primary" kbd="⌘S" onClick={a.saveSettings}>Save</Button>}/>
    <div style={{flex:1,overflowY:"auto"}}><div style={{maxWidth:720,padding:28,display:"flex",flexDirection:"column",gap:14}}>
      <Card title="General"><div style={row}><TimePicker label="Default send time" value={p.time} onChange={set("time")}/></div></Card>
      <Card title="Profile" subtitle="Used in the report sign-off"><div style={row}><Input label="Name" value={p.name} onChange={set("name")}/><Input label="Role" value={p.role} onChange={set("role")}/></div></Card>
      <Card title="Email"><div style={row}><Input label="Default recipient" value={p.to} onChange={set("to")}/><Input label="Default subject" value={p.subject} onChange={set("subject")} helper="Daily Digest - October 8, 2026"/></div></Card>
      <Card title="Zimbra" actions={s.zimbra?<StatusBadge status="sent" label="Connected" size="sm"/>:<StatusBadge status="none" label="Disconnected" size="sm"/>}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}><Input label="Zimbra URL" value={p.url} onChange={set("url")} helper="Uses your existing browser session. Your password is never entered here."/>
        {!s.zimbra&&<Banner tone="warning" title="Zimbra login required.">Open Zimbra and sign in, then test the connection.</Banner>}
        <div style={{display:"flex",gap:8}}><Button variant="outline" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button><Button loading={s.testing} onClick={a.testZimbra}>Test Connection</Button></div></div>
        <p style={{margin:"14px 0 0",font:"var(--text-helper)",color:"var(--fg-3)"}}>Daily Digest prepares emails in Zimbra and never presses Send.</p>
      </Card>
      <Card title="AI Provider" subtitle="Used to organize notes into the report"><div style={row}><Input label="Provider" value="Gemini" readOnly/><Select label="Model" value={p.model} onChange={set("model")} options={[{value:"flash",label:"Flash"},{value:"pro",label:"Pro"}]}/></div>
        <div style={{marginTop:14}}><Button variant="outline" loading={s.testingAI} onClick={a.testAI}>Test Connection</Button></div></Card>
    </div></div>
  </div>;
}
Object.assign(window,{ScheduledScreen,HistoryScreen,SettingsScreen});
