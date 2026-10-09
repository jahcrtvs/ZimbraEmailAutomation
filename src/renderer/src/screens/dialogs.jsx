import React from "react";
import * as DS from "../ds";
import { PageHeader, Overline, DigestDocument } from "../Shell.jsx";
import { fmt, isValidRecipients, dueAt, toISODate } from "@shared/time.js";
import { subjectFor } from "@shared/report.js";
import { Steps, lbl } from "./NewDigest.jsx";
const D = () => DS;export function ScheduleModal({s,a}){
  const {Modal,Button,DatePicker,TimePicker,Input,Icon,Banner}=D();const m=s.modal;const edit=m.edit;
  const src=edit?(m.id&&m.id!==s.curId?s.items.find(i=>i.id===m.id):s.schedule):{...s.schedule,date:toISODate(s.date)<toISODate(s.today)?s.today:s.date};
  const [d,setD]=React.useState(src.date);const [t,setT]=React.useState(src.time||s.settings.general.defaultSendTime);const [to,setTo]=React.useState(src.to);
  const bad=!isValidRecipients(to);
  const due=dueAt(toISODate(d),t);const past=!due||due<=new Date();
  const editId=edit?(m.id||s.curId):undefined;
  const confirm=()=>{if(past||bad)return;a.confirmSchedule({date:d,time:t,to},editId);};
  return <Modal title={edit?"Edit Schedule":"Schedule Send"} onClose={a.closeModal} width={460} footer={<><Button variant="ghost" onClick={a.closeModal}>Cancel</Button><Button variant="primary" icon="clock" disabled={past||bad} onClick={confirm}>{edit?"Save":"Schedule"}</Button></>}>
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {m.fail&&<Banner tone="danger" title="Unable to schedule the digest." actions={<Button size="sm" variant="primary" onClick={confirm}>Try Again</Button>}>No changes were made.</Banner>}
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><DatePicker label="Date" value={d} onChange={setD} minDate={s.today}/><TimePicker label="Time" value={t} onChange={setT}/></div>
        {past&&<div role="alert" style={{font:"var(--text-helper)",color:"var(--status-danger)",marginTop:6}}>Choose a time in the future.</div>}
      </div>
      <Input label="Recipients" value={to} onChange={setTo} helper="Separate multiple addresses with commas." error={bad?"Enter valid email addresses, separated by commas.":undefined}/>
      <div style={{display:"flex",gap:10,paddingTop:16,borderTop:"1px solid var(--border-subtle)",font:"var(--text-body)",color:"var(--fg-2)"}}><span style={{color:"var(--fg-3)",paddingTop:2}}><Icon name="lock" size={15}/></span><span style={{textWrap:"pretty"}}>The current approved version of this digest will be used when the email is prepared. At that time Zimbra is opened and the email is filled in. <b style={{color:"var(--fg-1)",fontWeight:600}}>You press Send.</b></span></div>
    </div>
  </Modal>;
}
export function SendModal({s,a}){
  const {Modal,Button}=D();
  const row=(k,v)=><div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border-subtle)"}}><span style={{color:"var(--fg-3)"}}>{k}</span><span>{v}</span></div>;
  return <Modal title="Send Daily Digest" onClose={a.closeModal} width={440} footer={<><Button variant="ghost" onClick={a.closeModal}>Cancel</Button><Button variant="primary" iconRight="external-link" onClick={a.confirmSend}>Prepare in Zimbra</Button></>}>
    <div>{row("Recipient",s.schedule.to)}{row("Subject",subjectFor(s.settings.email.defaultSubject,s.date,s.settings.email.dateFormat))}</div>
    <p style={{margin:"16px 0 0",color:"var(--fg-2)",textWrap:"pretty"}}>The current digest will be prepared in Zimbra. You review the message there and press Send yourself.</p>
  </Modal>;
}
export function PrepareModal({s,a}){
  const {Modal,Button,Icon}=D();const done=s.prepStep>=3;
  return <Modal title={done?"Email ready in Zimbra":"Preparing email in Zimbra…"} onClose={done?a.closeModal:undefined} width={440}
    footer={done?<><Button variant="ghost" onClick={a.closeModal}>Close</Button><Button variant="primary" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button></>:undefined}>
    {done?<div style={{display:"flex",gap:12}}><span style={{width:28,height:28,flexShrink:0,borderRadius:"50%",background:"var(--tint-success)",color:"var(--status-success)",display:"grid",placeItems:"center"}}><Icon name="check" size={15} strokeWidth={2.4}/></span><div style={{color:"var(--fg-2)",textWrap:"pretty"}}>Review the message in Zimbra before sending.<div style={{marginTop:6,color:"var(--fg-3)"}}>Daily Digest has not sent anything and never will.</div></div></div>
    :<div style={{paddingBottom:24}}><Steps steps={["Opening Zimbra","Checking session","Preparing message"]} step={s.prepStep}/></div>}
  </Modal>;
}
export function LoginModal({s,a}){
  const {ConfirmDialog}=D();
  return <ConfirmDialog tone="warning" icon="lock" title="Zimbra login required." description="Sign in to Zimbra in your browser, then try again. Daily Digest never asks for your Zimbra password." confirmLabel="Open Zimbra" cancelLabel="Close" onConfirm={a.loginZimbra} onCancel={a.closeModal}/>;
}
export function ZimbraErrorDialog({s,a}){
  const {ConfirmDialog,Banner}=D();
  const noChrome=s.modalCode==="NO_CHROME",compose=s.modalCode==="COMPOSE";
  if(noChrome)return <ConfirmDialog tone="danger" icon="circle-alert" title="Google Chrome is required." description="Daily Digest prepares your email in Google Chrome, which was not found on this computer. Install Chrome, then try again." confirmLabel="Retry" cancelLabel="Close" onConfirm={a.retryZimbra} onCancel={a.closeModal}><Banner tone="info" title="Nothing was sent." details={s.modalDetails}/></ConfirmDialog>;
  if(compose)return <ConfirmDialog tone="danger" icon="circle-alert" title="Unable to prepare the email." description="Zimbra opened, but the message could not be filled in. Try again or open Zimbra manually." confirmLabel="Retry" cancelLabel="Open Zimbra" onConfirm={a.retryZimbra} onCancel={a.openZimbra}><Banner tone="info" title="Nothing was sent." details={s.modalDetails}/></ConfirmDialog>;
  return <ConfirmDialog tone="danger" icon="circle-alert" title="Unable to connect to Zimbra." description="Check your connection or open Zimbra manually." confirmLabel="Retry" cancelLabel="Open Zimbra" onConfirm={a.retryZimbra} onCancel={a.openZimbra}><Banner tone="info" title="Nothing was sent." details={s.modalDetails}/></ConfirmDialog>;
}
export function ZimbraStatusModal({s,a}){
  const {Modal,Button,Input,StatusBadge,Banner}=D();
  return <Modal title="Zimbra" onClose={a.closeModal} width={440} footer={<><Button variant="outline" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button><Button variant="primary" loading={s.testing} onClick={a.testZimbra}>Test Connection</Button></>}>
    <div style={{display:"flex",flexDirection:"column",gap:16}}><Input label="Zimbra URL" value={s.settings.zimbra.url} readOnly/>
    <div><div style={lbl}>Status</div>{s.zimbra?<StatusBadge status="sent" label="Connected"/>:<StatusBadge status="none" label="Disconnected"/>}</div>
    {!s.zimbra&&<Banner tone="warning" title="Zimbra login required.">Open Zimbra and sign in. Daily Digest uses your existing browser session.</Banner>}</div>
  </Modal>;
}
export function ConfirmCancel({s,a}){
  const {ConfirmDialog}=D();
  return <ConfirmDialog tone="danger" icon="clock" title="Cancel scheduled digest?" description="This digest will no longer be prepared in Zimbra." confirmLabel="Cancel Schedule" cancelLabel="Keep Scheduled" onConfirm={()=>a.cancelSchedule(s.modal.id)} onCancel={a.closeModal}/>;
}
export function ConfirmRegen({a}){
  const {ConfirmDialog}=D();
  return <ConfirmDialog tone="warning" icon="refresh-cw" title="Replace the current digest?" description="Regenerating creates a new report from your notes. Your edits to this version will be lost." confirmLabel="Regenerate" cancelLabel="Keep Current" onConfirm={a.generate} onCancel={a.closeModal}/>;
}
export function MissedDialog({s,a}){
  const {ConfirmDialog}=D();const it=s.items.find(i=>i.id===s.modal.id)||{time:s.settings.general.defaultSendTime};
  return <ConfirmDialog tone="warning" icon="triangle-alert" title="Missed Scheduled Digest" description={<>Your Daily Digest was scheduled for {it.time}, but the application was not running.<br/><br/><b style={{color:"var(--fg-1)"}}>No email was sent.</b></>} confirmLabel="Prepare Now" cancelLabel="Cancel" onConfirm={()=>a.prepareMissed(it.id)} onCancel={()=>a.dismissMissed(it.id)}/>;
}
export function ViewModal({s,a}){
  const {Modal,Button}=D();const it=s.items.find(i=>i.id===s.modal.id);
  if(!it)return null;
  return <Modal title={"Daily Digest · "+fmt(it.date)} onClose={a.closeModal} width={620} footer={<Button variant="ghost" onClick={a.closeModal}>Close</Button>}>
    <div style={{maxHeight:420,overflowY:"auto"}}><DigestDocument blocks={it.blocks} subject={it.subject||subjectFor(s.settings.email.defaultSubject,it.date,s.settings.email.dateFormat)} to={it.to}/></div></Modal>;
}