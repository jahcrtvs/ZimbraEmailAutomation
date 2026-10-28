import React from "react";
import * as DS from "../ds";
import { PageHeader } from "../Shell.jsx";
import { isValidRecipients, DATE_FORMATS, formatDate } from "@shared/time.js";
import { subjectFor } from "@shared/report.js";
import { DEFAULT_LOCAL, PROVIDER_NAMES, isCloudModel, isLoopbackUrl, pullCommand } from "@shared/ai.js";
const D = () => DS;
const validUrl = u => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
export function SettingsScreen({s,a}){
  const {Card,Button,Input,Select,TimePicker,StatusBadge,Banner,Switch}=D();
  const ai=s.settings.ai;
  const [p,setP]=React.useState({
    name:s.settings.profile.name,role:s.settings.profile.role,
    to:s.settings.email.defaultRecipient,subject:s.settings.email.defaultSubject,dateFormat:s.settings.email.dateFormat,
    time:s.settings.general.defaultSendTime,url:s.settings.zimbra.url,alarmOn:s.settings.alarm.enabled,alarmTime:s.settings.alarm.time,startup:s.settings.app.startWithWindows,
    lurl:ai.local.baseUrl,lmodel:ai.local.model,fb:ai.fallback.provider,fbAuto:ai.fallback.auto?"auto":"ask",gmodel:ai.geminiModel,terms:ai.privacyTerms,apiKey:""});
  const [tried,setTried]=React.useState(false);
  const badTo=!isValidRecipients(p.to),badUrl=!validUrl(p.url),badLocal=!validUrl(p.lurl)||!p.lmodel.trim();
  const save=()=>{
    if(badTo||badUrl||badLocal){setTried(true);return Promise.resolve(false);}
    setTried(false);
    const done=a.saveSettings({apiKey:p.apiKey,settings:{...s.settings,
      general:{...s.settings.general,defaultSendTime:p.time},
      alarm:{enabled:p.alarmOn,time:p.alarmTime},
      app:{...s.settings.app,startWithWindows:p.startup},
      profile:{name:p.name,role:p.role},
      email:{defaultRecipient:p.to,defaultSubject:p.subject,dateFormat:p.dateFormat},
      zimbra:{url:p.url},
      ai:{local:{baseUrl:p.lurl.trim(),model:p.lmodel.trim()},fallback:{provider:p.fb,auto:p.fbAuto==="auto"},geminiModel:p.gmodel,privacyTerms:p.terms}}});
    setP(x=>({...x,apiKey:""}));
    return Promise.resolve(done);
  };
  const check=async()=>{if(await save()===false)return;a.checkLocal();};
  React.useEffect(()=>{window.__ddSaveSettings=save;return()=>{delete window.__ddSaveSettings;};});
  const set=k=>v=>setP({...p,[k]:v});const row={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14};
  const ls=s.localStatus,col={display:"flex",flexDirection:"column",gap:14};
  const recent=(s.audit||[]).slice(-5).reverse();
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Settings" right={<Button variant="primary" kbd="Ctrl+S" onClick={save}>Save</Button>}/>
    <div style={{flex:1,overflowY:"auto"}}><div className="settings-cols" style={{padding:"4px 28px 28px",columnWidth:420,columnGap:14}}>
      <Card title="General"><div style={col}><div style={row}><TimePicker label="Default send time" value={p.time} onChange={set("time")}/></div><Switch label="Start with Windows" checked={p.startup} onChange={set("startup")}/><div><Button variant="outline" icon="circle-help" onClick={a.startTour}>Show tutorial</Button></div></div></Card>
      <Card title="Daily alarm" subtitle="A Windows notification on weekdays to write today's digest. Skipped once it is sent or scheduled.">
        <div style={col}>
          <Switch label="Remind me" checked={p.alarmOn} onChange={set("alarmOn")}/>
          {p.alarmOn&&<div style={row}><TimePicker label="Alarm time" value={p.alarmTime} onChange={set("alarmTime")}/></div>}
          {p.alarmOn&&<p style={{margin:0,font:"var(--text-helper)",color:"var(--fg-3)"}}>Closing the window keeps Daily Digest running, minimised, so the alarm can go off.</p>}
        </div>
      </Card>
      <Card title="Profile" subtitle="Used in the report sign-off"><div style={row}><Input label="Name" value={p.name} onChange={set("name")}/><Input label="Role" value={p.role} onChange={set("role")}/></div></Card>
      <Card title="Email"><div style={row}><Input label="Default recipients" value={p.to} onChange={set("to")} helper="Separate multiple addresses with commas." error={tried&&badTo?"Enter valid email addresses, separated by commas.":undefined}/><Input label="Default subject" value={p.subject} onChange={set("subject")} helper={subjectFor(p.subject,s.today,p.dateFormat)}/><Select label="Date format" value={p.dateFormat} onChange={set("dateFormat")} options={Object.keys(DATE_FORMATS).map(k=>({value:k,label:formatDate(s.today,k)}))}/></div></Card>
      <Card title="Zimbra" actions={s.zimbra?<StatusBadge status="sent" label="Connected" size="sm"/>:<StatusBadge status="none" label="Disconnected" size="sm"/>}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}><Input label="Zimbra URL" value={p.url} onChange={set("url")} helper="Uses your existing browser session. Your password is never entered here." error={tried&&badUrl?"Enter a valid URL.":undefined}/>
        {!s.zimbra&&<Banner tone="warning" title="Zimbra login required.">Open Zimbra and sign in, then test the connection.</Banner>}
        <div style={{display:"flex",gap:8}}><Button variant="outline" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button><Button loading={s.testing} onClick={a.testZimbra}>Test Connection</Button></div></div>
        <p style={{margin:"14px 0 0",font:"var(--text-helper)",color:"var(--fg-3)"}}>Daily Digest prepares emails in Zimbra and never presses Send.</p>
      </Card>
      <Card title="Local AI" subtitle="Runs on this computer through Ollama. Your notes stay here." actions={ls?<StatusBadge status={ls.state==="ready"?"sent":"failed"} label={ls.state==="ready"?"Ready":ls.state==="no-model"?"Model missing":"Not running"} size="sm"/>:<StatusBadge status="none" label="Not checked" size="sm"/>}>
        <div style={col}>
          <div style={row}>
            <Input label="Server address" value={p.lurl} onChange={set("lurl")} helper={"Default "+DEFAULT_LOCAL.baseUrl} error={tried&&!validUrl(p.lurl)?"Enter a valid http(s) address.":undefined}/>
            <Input label="Model" value={p.lmodel} onChange={set("lmodel")} helper={"Default "+DEFAULT_LOCAL.model} error={tried&&!p.lmodel.trim()?"Enter a model name.":undefined}/>
          </div>
          {validUrl(p.lurl)&&!isLoopbackUrl(p.lurl)&&<Banner tone="warning" title="This address is not on this computer.">Your notes are sent to that server with emails, links, names and the words you hide replaced, the same as for a cloud service. Past reports are never sent there.</Banner>}
          {isCloudModel(p.lmodel)&&<Banner tone="warning" title="This is a cloud model.">Ollama models whose name ends in -cloud or :cloud run on Ollama's servers, not on this computer. Your notes are sent with emails, links, names and the words you hide replaced.</Banner>}
          {ls&&ls.state==="no-server"&&<Banner tone="warning" title="Local AI is not running.">{ls.detail}</Banner>}
          {ls&&ls.state==="no-model"&&<Banner tone="warning" title="Model not installed.">Run this in a terminal, then check again: <code>{ls.command||pullCommand(p.lmodel)}</code></Banner>}
          <div><Button variant="outline" loading={s.checkingLocal} onClick={check}>Save and check</Button></div>
        </div>
      </Card>
      <Card title="Cloud fallback" subtitle="Used only when the local AI fails, and only as described below.">
        <div style={col}>
          <div style={row}>
            <Select label="Fallback provider" value={p.fb} onChange={v=>setP({...p,fb:v,apiKey:""})} options={[{value:"none",label:"None (local only)"},{value:"groq",label:PROVIDER_NAMES.groq},{value:"gemini",label:PROVIDER_NAMES.gemini}]}/>
            {p.fb!=="none"&&<Select label="When the local AI fails" value={p.fbAuto} onChange={set("fbAuto")} options={[{value:"ask",label:"Ask me each time"},{value:"auto",label:"Send automatically"}]}/>}
          </div>
          {p.fb==="gemini"&&<Select label="Gemini model" value={p.gmodel} onChange={set("gmodel")} options={[{value:"flash",label:"Flash"},{value:"pro",label:"Pro"}]}/>}
          {p.fb==="gemini"&&<Banner tone="warning" title="Free Gemini use may be used by Google.">Google can use content sent through the free Gemini API to improve its products. Use a paid project if your notes are sensitive.</Banner>}
          {p.fb!=="none"&&<>
            <Input label="API key" type="password" value={p.apiKey} onChange={v=>setP({...p,apiKey:v})} placeholder={s.hasKey[p.fb]?"Saved":"Paste your key"} helper="Stored encrypted on this computer."/>
            <Input label="Words to hide from cloud services" value={p.terms} onChange={set("terms")} helper="Comma separated, for example your manager's name or your company. Your own name is always hidden."/>
            <Banner tone="info" title="What is sent.">Only your notes. Emails, links, IP addresses, phone numbers, long tokens and the words above are replaced with placeholders first and put back afterwards. Notes that look like they contain a password or key are never sent.</Banner>
            <div><Button variant="outline" loading={s.testingAI} onClick={()=>a.testAI(p.fb)}>Test Connection</Button></div>
          </>}
          {recent.length>0&&<div>
            <div style={{font:"500 12px/1.2 var(--font-sans)",color:"var(--fg-2)",marginBottom:6}}>Recent cloud sends</div>
            {recent.map((e,i)=><div key={e.at+i} style={{font:"var(--text-helper)",color:"var(--fg-3)"}}>{new Date(e.at).toLocaleString()} · {PROVIDER_NAMES[e.provider]||e.provider} · {e.reason} · {e.chars} characters</div>)}
          </div>}
        </div>
      </Card>
      <div style={{font:"var(--text-helper)",color:"var(--fg-3)",textAlign:"center"}}>Daily Digest v{__APP_VERSION__}</div>
    </div></div>
  </div>;
}
