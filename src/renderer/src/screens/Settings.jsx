import React from "react";
import * as DS from "../ds";
import { PageHeader } from "../Shell.jsx";
import { isValidEmail } from "@shared/time.js";
import { subjectFor } from "@shared/report.js";
const D = () => DS;
const validUrl = u => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
export function SettingsScreen({s,a}){
  const {Card,Button,Input,Select,TimePicker,StatusBadge,Banner}=D();
  const [p,setP]=React.useState({
    name:s.settings.profile.name,role:s.settings.profile.role,
    to:s.settings.email.defaultRecipient,subject:s.settings.email.defaultSubject,
    time:s.settings.general.defaultSendTime,model:s.settings.ai.model,url:s.settings.zimbra.url,apiKey:""});
  const [tried,setTried]=React.useState(false);
  const badTo=!isValidEmail(p.to),badUrl=!validUrl(p.url);
  const save=()=>{
    if(badTo||badUrl){setTried(true);return;}
    setTried(false);
    a.saveSettings({apiKey:p.apiKey,settings:{...s.settings,
      general:{...s.settings.general,defaultSendTime:p.time},
      profile:{name:p.name,role:p.role},
      email:{defaultRecipient:p.to,defaultSubject:p.subject},
      zimbra:{url:p.url},
      ai:{...s.settings.ai,model:p.model}}});
    setP(x=>({...x,apiKey:""}));
  };
  React.useEffect(()=>{window.__ddSaveSettings=save;return()=>{delete window.__ddSaveSettings;};});
  const set=k=>v=>setP({...p,[k]:v});const row={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14};
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Settings" right={<Button variant="primary" kbd="⌘S" onClick={save}>Save</Button>}/>
    <div style={{flex:1,overflowY:"auto"}}><div style={{maxWidth:720,padding:28,display:"flex",flexDirection:"column",gap:14}}>
      <Card title="General"><div style={row}><TimePicker label="Default send time" value={p.time} onChange={set("time")}/></div></Card>
      <Card title="Profile" subtitle="Used in the report sign-off"><div style={row}><Input label="Name" value={p.name} onChange={set("name")}/><Input label="Role" value={p.role} onChange={set("role")}/></div></Card>
      <Card title="Email"><div style={row}><Input label="Default recipient" value={p.to} onChange={set("to")} error={tried&&badTo?"Enter a valid email address.":undefined}/><Input label="Default subject" value={p.subject} onChange={set("subject")} helper={subjectFor(p.subject,s.today)}/></div></Card>
      <Card title="Zimbra" actions={s.zimbra?<StatusBadge status="sent" label="Connected" size="sm"/>:<StatusBadge status="none" label="Disconnected" size="sm"/>}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}><Input label="Zimbra URL" value={p.url} onChange={set("url")} helper="Uses your existing browser session. Your password is never entered here." error={tried&&badUrl?"Enter a valid URL.":undefined}/>
        {!s.zimbra&&<Banner tone="warning" title="Zimbra login required.">Open Zimbra and sign in, then test the connection.</Banner>}
        <div style={{display:"flex",gap:8}}><Button variant="outline" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button><Button loading={s.testing} onClick={a.testZimbra}>Test Connection</Button></div></div>
        <p style={{margin:"14px 0 0",font:"var(--text-helper)",color:"var(--fg-3)"}}>Daily Digest prepares emails in Zimbra and never presses Send.</p>
      </Card>
      <Card title="AI Provider" subtitle="Used to organize notes into the report"><div style={row}><Input label="Provider" value="Gemini" readOnly/><Select label="Model" value={p.model} onChange={set("model")} options={[{value:"flash",label:"Flash"},{value:"pro",label:"Pro"}]}/></div>
        <div style={{marginTop:14}}><Input label="API key" type="password" value={p.apiKey} onChange={v=>setP({...p,apiKey:v})} placeholder={s.hasKey?"Saved":"Paste your key"} helper="Stored encrypted on this computer."/></div>
        <div style={{marginTop:14}}><Button variant="outline" loading={s.testingAI} onClick={a.testAI}>Test Connection</Button></div></Card>
    </div></div>
  </div>;
}