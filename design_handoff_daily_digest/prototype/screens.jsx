const D=()=>window.ZimbraDigestDesignSystem_9514e4;
const NOTE_LABELS={work:"Today's Work",topics:"Topics / Lessons",progress:"Still Working On",blockers:"Blockers",tomorrow:"Tomorrow"};
const lbl={font:"500 12px/1.2 var(--font-sans)",color:"var(--fg-2)",marginBottom:6};
function InputPane({s,a}){
  const {Textarea,Button}=D();const n=s.notes,busy=s.stage==="generating";const set=k=>v=>a.setNotes({...n,[k]:v});
  const empty=!Object.values(n).some(v=>v.trim());
  return <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    <div style={{flex:1,overflowY:"auto",padding:"20px 28px",display:"flex",flexDirection:"column",gap:14,opacity:busy?.5:1,pointerEvents:busy?"none":"auto"}}>
      <p style={{margin:0,font:"500 15px/1.3 var(--font-sans)",color:"var(--fg-1)"}}>What did you work on today?<span style={{display:"block",font:"var(--text-helper)",color:"var(--fg-3)",marginTop:4}}>Rough notes are fine. The report is organized after you generate it.</span></p>
      <Textarea label="Today's Work" rows={4} autoFocus value={n.work} onChange={set("work")} placeholder={"worked on hibernate\ncriteria query\nfixed duplicates"}/>
      <Textarea label="Topics / Lessons" hint="Optional" rows={2} value={n.topics} onChange={set("topics")} placeholder="What did you study or learn today?"/>
      <Textarea label="Still Working On" hint="Optional" rows={2} value={n.progress} onChange={set("progress")} placeholder="Work that is not finished yet"/>
      <Textarea label="Blockers" hint="Optional" rows={2} value={n.blockers} onChange={set("blockers")} placeholder="Anything blocking your progress?"/>
      <Textarea label="Tomorrow" hint="Optional" rows={2} value={n.tomorrow} onChange={set("tomorrow")} placeholder="What you plan to continue next"/>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 28px",borderTop:"1px solid var(--border-subtle)"}}>
      {empty&&<Button variant="ghost" size="sm" icon="copy" onClick={a.fillSample}>Use example notes</Button>}
      <div style={{flex:1}}/>
      <Button variant="primary" size="lg" loading={busy} disabled={empty} kbd={busy?undefined:"⌘↵"} onClick={a.generate}>{busy?"Generating…":"Generate Digest"}</Button>
    </div>
  </div>;
}
function NotesSummary({s,a}){
  const {Button}=D();
  return <div style={{padding:24,display:"flex",flexDirection:"column",gap:18,overflowY:"auto",height:"100%",boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Overline>Your notes</Overline><Button size="sm" variant="ghost" icon="pencil" onClick={a.editNotes}>Edit notes</Button></div>
    {Object.keys(NOTE_LABELS).filter(k=>s.notes[k].trim()).map(k=><div key={k}><div style={lbl}>{NOTE_LABELS[k]}</div><div style={{font:"400 13px/1.55 var(--font-mono)",color:"var(--fg-3)",whiteSpace:"pre-wrap"}}>{s.notes[k]}</div></div>)}
  </div>;
}
function StatusPanel({s,a}){
  const {Button,Icon}=D();const st=s.digestStatus;const sent=st==="sent",prep=st==="prepared";
  const head=(ic,tone,t)=><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{width:28,height:28,borderRadius:"50%",background:`var(--tint-${tone})`,color:`var(--status-${tone})`,display:"grid",placeItems:"center"}}><Icon name={ic} size={15} strokeWidth={2.4}/></span><span style={{font:"600 15px/1.2 var(--font-sans)"}}>{t}</span></div>;
  const kv=(k,v)=><div><div style={{font:"var(--text-meta)",color:"var(--fg-3)",marginBottom:4}}>{k}</div><div>{v}</div></div>;
  if(st==="scheduled")return <div style={{padding:24,display:"flex",flexDirection:"column",gap:20}}>
    {head("clock","info","Scheduled")}
    <div><div style={{font:"var(--text-led-time)",color:"var(--fg-accent)"}}>{s.schedule.time}</div><div style={{color:"var(--fg-2)",marginTop:10}}>{DD.fmt(s.schedule.date)}</div></div>
    {kv("Recipient",s.schedule.to)}
    <div style={{display:"flex",gap:10,padding:"12px 0",borderTop:"1px solid var(--border-subtle)",borderBottom:"1px solid var(--border-subtle)",font:"var(--text-body)",color:"var(--fg-2)"}}><span style={{color:"var(--fg-3)",paddingTop:2}}><Icon name="lock" size={15}/></span><span style={{textWrap:"pretty"}}><b style={{color:"var(--fg-1)",fontWeight:600}}>Approved version.</b> The report shown here will be used as is.</span></div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}><Button variant="outline" icon="clock" full onClick={()=>a.openSchedule(true)}>Edit Schedule</Button><Button variant="danger" full onClick={()=>a.setModal({t:"cancelSched",id:"cur"})}>Cancel Schedule</Button></div>
    <p style={{margin:0,font:"var(--text-helper)",color:"var(--fg-3)"}}>At {s.schedule.time}, Daily Digest prepares this email in Zimbra and stops. Nothing is sent until you press Send in Zimbra.</p>
  </div>;
  if(prep)return <div style={{padding:24,display:"flex",flexDirection:"column",gap:20}}>
    {head("mail","info","Prepared in Zimbra")}
    <p style={{margin:0,color:"var(--fg-2)",textWrap:"pretty"}}>The email is waiting in Zimbra. Review it there and press Send. Nothing has been sent yet.</p>
    {kv("Recipient",s.schedule.to)}
    <div style={{display:"flex",flexDirection:"column",gap:8}}><Button variant="outline" iconRight="external-link" full onClick={a.openZimbra}>Open Zimbra</Button><Button variant="primary" icon="check" full onClick={a.markSent}>I've Sent It</Button></div>
  </div>;
  return <div style={{padding:24,display:"flex",flexDirection:"column",gap:20}}>
    {head("check","success","Sent")}
    <div><div style={{font:"var(--text-led-time)"}}>{s.sentAt}</div><div style={{color:"var(--fg-2)",marginTop:10}}>{DD.fmt(s.date)}</div></div>
    {kv("Recipient",s.schedule.to)}
    <Button variant="outline" icon="square-pen" full onClick={a.resetDigest}>Start New Digest</Button>
  </div>;
}
function Steps({title,steps,step}){
  const {Icon}=D();
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {title&&<div style={{font:"600 15px/1.3 var(--font-sans)",marginBottom:4}}>{title}</div>}
    {steps.map((t,i)=><div key={t} style={{display:"flex",alignItems:"center",gap:10,color:i<step?"var(--fg-2)":i===step?"var(--fg-1)":"var(--fg-3)"}}>
      <span style={{width:18,display:"flex",justifyContent:"center",color:i<step?"var(--status-success)":"var(--fg-2)",animation:i===step?"dd-spin .9s linear infinite":"none"}}><Icon name={i<step?"check":i===step?"loader-circle":"circle"} size={i<=step?16:8} strokeWidth={i<step?2.5:1.75}/></span>{t}</div>)}
  </div>;
}
function Placeholder(){
  return <div style={{border:"1px dashed var(--border-default)",borderRadius:"var(--radius-md)",padding:28,display:"flex",flexDirection:"column",gap:22}}>
    {["TASK TODAY","PLANS FOR THE WEEK","TOPICS"].map((t,i)=><div key={t}><div style={{font:"700 11px/1 var(--font-sans)",letterSpacing:".06em",color:"var(--fg-3)",marginBottom:10}}>{t}</div>{[80,62,70].slice(0,3-i).map((w,k)=><div key={k} style={{height:8,width:w+"%",borderRadius:4,background:"var(--ink-3)",marginBottom:8}}/>)}</div>)}
    <div style={{font:"var(--text-meta)",color:"var(--fg-3)"}}>The report appears here after you generate it.</div>
  </div>;
}
function NewDigestScreen({s,a}){
  const {Button,StatusBadge,Banner}=D();
  const stage=s.stage,review=["review","editing"].includes(stage),st=s.digestStatus,locked=["scheduled","prepared","sent"].includes(st);
  const showDoc=review||locked;
  const subject="Daily Digest - "+DD.fmt(s.date);
  const bs=stage==="error"?"failed":stage==="generating"?"generating":st==="prepared"?"sending":locked?st:review?"ready":st==="draft"?"draft":"draft";
  const bl=stage==="error"?"Generation failed":st==="prepared"?"Prepared in Zimbra":stage==="editing"?"Editing":undefined;
  const ver=stage==="editing"?"Editing":locked?(st==="scheduled"?"Approved version · locked":"Read only"):s.savedAt?"Edited · Saved "+s.savedAt:"Generated "+s.genAt;
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title={showDoc?"Daily Digest":"New Daily Digest"} meta={DD.fmt(s.date)} right={<StatusBadge status={bs} label={bl} detail={st==="scheduled"&&!bl?s.schedule.time:undefined}/>}/>
    <div style={{flex:1,minHeight:0,display:"grid",gridTemplateColumns:showDoc?"320px minmax(0,1fr)":"minmax(0,1fr) minmax(0,1fr)"}}>
      <div style={{borderRight:"1px solid var(--border-subtle)",minHeight:0,overflow:"hidden"}}>{locked?<StatusPanel s={s} a={a}/>:review?<NotesSummary s={s} a={a}/>:<InputPane s={s} a={a}/>}</div>
      <div style={{display:"flex",flexDirection:"column",minHeight:0,background:"var(--surface-sunken)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 28px 0"}}><Overline>{showDoc?"Report":"Preview"}</Overline><div style={{flex:1}}/>{showDoc&&<span style={{font:"var(--text-meta)",color:stage==="editing"?"var(--orange-400)":"var(--fg-3)"}}>{ver}</span>}</div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 28px 24px"}}>
          {stage==="form"&&!showDoc&&<Placeholder/>}
          {stage==="generating"&&<div style={{padding:"48px 8px"}}><Steps title="Generating report…" steps={["Reading your notes","Applying the template","Preparing the report"]} step={s.genStep}/></div>}
          {stage==="error"&&<div style={{paddingTop:12}}><Banner tone="danger" title="Unable to generate the digest." details={"503 UNAVAILABLE: service overloaded\nrequest_id=7f2c19a0"} actions={<Button size="sm" variant="primary" onClick={a.generate}>Try Again</Button>}>Your original notes are still available.</Banner></div>}
          {showDoc&&<DigestDocument blocks={s.blocks} subject={subject} to={s.schedule.to} editing={stage==="editing"} draft={s.draft} setDraft={a.setDraft}/>}
        </div>
        {review&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 28px",borderTop:"1px solid var(--border-subtle)",background:"var(--surface-window)"}}>
          {stage==="review"?<>
            <Button variant="outline" icon="pencil" onClick={a.startEdit}>Edit</Button>
            <Button variant="ghost" icon="refresh-cw" onClick={a.regenerate}>Regenerate</Button><div style={{flex:1}}/>
            <Button variant="outline" icon="send" onClick={a.openSend}>Send Now</Button>
            <Button variant="primary" size="lg" icon="clock" kbd="⌘⇧S" onClick={()=>a.openSchedule(false)}>Schedule Send</Button>
          </>:<>
            <span style={{font:"var(--text-meta)",color:"var(--fg-3)"}}>One bullet per line. Changes apply to this digest only.</span><div style={{flex:1}}/>
            <Button variant="ghost" onClick={a.cancelEdit}>Cancel</Button><Button variant="primary" icon="check" kbd="⌘S" onClick={a.saveEdit}>Save Changes</Button>
          </>}
        </div>}
      </div>
    </div>
  </div>;
}
function ScheduleModal({s,a}){
  const {Modal,Button,DatePicker,TimePicker,Input,Icon,Banner}=D();const m=s.modal;const edit=m.edit;
  const src=edit?(m.id&&m.id!=="cur"?s.items.find(i=>i.id===m.id):s.schedule):{...s.schedule,date:s.date};const [d,setD]=React.useState(src.date);const [t,setT]=React.useState(src.time);const [to,setTo]=React.useState(src.to);
  const bad=!/^\S+@\S+\.\S+$/.test(to);
  return <Modal title={edit?"Edit Schedule":"Schedule Send"} onClose={a.closeModal} width={460} footer={<><Button variant="ghost" onClick={a.closeModal}>Cancel</Button><Button variant="primary" icon="clock" disabled={bad} onClick={()=>a.confirmSchedule({date:d,time:t,to},edit?(m.id||"cur"):null)}>{edit?"Save":"Schedule"}</Button></>}>
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {m.fail&&<Banner tone="danger" title="Unable to schedule the digest." actions={<Button size="sm" variant="primary" onClick={()=>a.confirmSchedule({date:d,time:t,to},edit?(m.id||"cur"):null,true)}>Try Again</Button>}>No changes were made.</Banner>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><DatePicker label="Date" value={d} onChange={setD} minDate={DD.today}/><TimePicker label="Time" value={t} onChange={setT}/></div>
      <Input label="Recipient" value={to} onChange={setTo} error={bad?"Enter a valid email address.":undefined}/>
      <div style={{display:"flex",gap:10,paddingTop:16,borderTop:"1px solid var(--border-subtle)",font:"var(--text-body)",color:"var(--fg-2)"}}><span style={{color:"var(--fg-3)",paddingTop:2}}><Icon name="lock" size={15}/></span><span style={{textWrap:"pretty"}}>The current approved version of this digest will be used when the email is prepared. At that time Zimbra is opened and the email is filled in. <b style={{color:"var(--fg-1)",fontWeight:600}}>You press Send.</b></span></div>
    </div>
  </Modal>;
}
function SendModal({s,a}){
  const {Modal,Button}=D();
  const row=(k,v)=><div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border-subtle)"}}><span style={{color:"var(--fg-3)"}}>{k}</span><span>{v}</span></div>;
  return <Modal title="Send Daily Digest" onClose={a.closeModal} width={440} footer={<><Button variant="ghost" onClick={a.closeModal}>Cancel</Button><Button variant="primary" iconRight="external-link" onClick={a.confirmSend}>Prepare in Zimbra</Button></>}>
    <div>{row("Recipient",s.schedule.to)}{row("Subject","Daily Digest - "+DD.fmt(s.date))}</div>
    <p style={{margin:"16px 0 0",color:"var(--fg-2)",textWrap:"pretty"}}>The current digest will be prepared in Zimbra. You review the message there and press Send yourself.</p>
  </Modal>;
}
function PrepareModal({s,a}){
  const {Modal,Button,Icon}=D();const done=s.prepStep>=3;
  return <Modal title={done?"Email ready in Zimbra":"Preparing email in Zimbra…"} onClose={done?a.closeModal:undefined} width={440}
    footer={done?<><Button variant="ghost" onClick={a.closeModal}>Close</Button><Button variant="primary" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button></>:undefined}>
    {done?<div style={{display:"flex",gap:12}}><span style={{width:28,height:28,flexShrink:0,borderRadius:"50%",background:"var(--tint-success)",color:"var(--status-success)",display:"grid",placeItems:"center"}}><Icon name="check" size={15} strokeWidth={2.4}/></span><div style={{color:"var(--fg-2)",textWrap:"pretty"}}>Review the message in Zimbra before sending.<div style={{marginTop:6,color:"var(--fg-3)"}}>Daily Digest has not sent anything and never will.</div></div></div>
    :<div style={{paddingBottom:24}}><Steps steps={["Opening Zimbra","Checking session","Preparing message"]} step={s.prepStep}/></div>}
  </Modal>;
}
function LoginModal({s,a}){
  const {ConfirmDialog}=D();
  return <ConfirmDialog tone="warning" icon="lock" title="Zimbra login required." description="Sign in to Zimbra in your browser, then try again. Daily Digest never asks for your Zimbra password." confirmLabel="Open Zimbra" cancelLabel="Close" onConfirm={a.loginZimbra} onCancel={a.closeModal}/>;
}
function ZimbraErrorDialog({a}){
  const {ConfirmDialog,Banner}=D();
  return <ConfirmDialog tone="danger" icon="circle-alert" title="Unable to connect to Zimbra." description="Check your connection or open Zimbra manually." confirmLabel="Retry" cancelLabel="Open Zimbra" onConfirm={a.retryZimbra} onCancel={a.openZimbra}><Banner tone="info" title="Nothing was sent." details={"ECONNREFUSED https://mail.company.local:443"}/></ConfirmDialog>;
}
function ZimbraStatusModal({s,a}){
  const {Modal,Button,Input,StatusBadge,Banner}=D();
  return <Modal title="Zimbra" onClose={a.closeModal} width={440} footer={<><Button variant="outline" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button><Button variant="primary" loading={s.testing} onClick={a.testZimbra}>Test Connection</Button></>}>
    <div style={{display:"flex",flexDirection:"column",gap:16}}><Input label="Zimbra URL" value={DD.zimbraUrl} readOnly/>
    <div><div style={lbl}>Status</div>{s.zimbra?<StatusBadge status="sent" label="Connected"/>:<StatusBadge status="none" label="Disconnected"/>}</div>
    {!s.zimbra&&<Banner tone="warning" title="Zimbra login required.">Open Zimbra and sign in. Daily Digest uses your existing browser session.</Banner>}</div>
  </Modal>;
}
function ConfirmCancel({s,a}){
  const {ConfirmDialog}=D();
  return <ConfirmDialog tone="danger" icon="clock" title="Cancel scheduled digest?" description="This digest will no longer be prepared in Zimbra." confirmLabel="Cancel Schedule" cancelLabel="Keep Scheduled" onConfirm={()=>a.cancelSchedule(s.modal.id)} onCancel={a.closeModal}/>;
}
function ConfirmRegen({a}){
  const {ConfirmDialog}=D();
  return <ConfirmDialog tone="warning" icon="refresh-cw" title="Replace the current digest?" description="Regenerating creates a new report from your notes. Your edits to this version will be lost." confirmLabel="Regenerate" cancelLabel="Keep Current" onConfirm={a.generate} onCancel={a.closeModal}/>;
}
function MissedDialog({s,a}){
  const {ConfirmDialog}=D();const it=s.items.find(i=>i.id===s.modal.id)||{time:"5:00 PM"};
  return <ConfirmDialog tone="warning" icon="triangle-alert" title="Missed Scheduled Digest" description={<>Your Daily Digest was scheduled for {it.time}, but the application was not running.<br/><br/><b style={{color:"var(--fg-1)"}}>No email was sent.</b></>} confirmLabel="Prepare Now" cancelLabel="Cancel" onConfirm={()=>a.prepareMissed(it.id)} onCancel={()=>a.dismissMissed(it.id)}/>;
}
function ViewModal({s,a}){
  const {Modal,Button}=D();const it=s.items.find(i=>i.id===s.modal.id);
  return <Modal title={"Daily Digest · "+DD.fmt(it.date)} onClose={a.closeModal} width={620} footer={<Button variant="ghost" onClick={a.closeModal}>Close</Button>}>
    <div style={{maxHeight:420,overflowY:"auto"}}><DigestDocument blocks={it.blocks} subject={"Daily Digest - "+DD.fmt(it.date)} to={it.to}/></div></Modal>;
}
Object.assign(window,{NewDigestScreen,ScheduleModal,SendModal,PrepareModal,LoginModal,ZimbraErrorDialog,ZimbraStatusModal,ConfirmCancel,ConfirmRegen,MissedDialog,ViewModal,Steps,lbl});
