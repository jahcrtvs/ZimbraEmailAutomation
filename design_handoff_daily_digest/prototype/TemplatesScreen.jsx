function TemplateEditor({value,onChange}){
  const ta=React.useRef(null),hl=React.useRef(null);
  const esc=t=>t.replace(/&/g,"&amp;").replace(/</g,"&lt;");
  const html=esc(value).replace(/\{(\w+)\}/g,'<span style="color:var(--orange-400);background:var(--tint-accent);border-radius:4px">{$1}</span>')+"\n";
  const box={margin:0,padding:"16px 18px",font:"400 13px/1.7 var(--font-mono)",whiteSpace:"pre-wrap",wordBreak:"break-word",boxSizing:"border-box",border:0};
  return <div style={{position:"relative",flex:1,minHeight:0,borderRadius:"var(--radius-md)",background:"var(--surface-field)",border:"1px solid var(--border-default)",overflow:"hidden"}}>
    <pre ref={hl} aria-hidden="true" style={{...box,position:"absolute",inset:0,overflow:"hidden",color:"var(--fg-2)",pointerEvents:"none"}} dangerouslySetInnerHTML={{__html:html}}/>
    <textarea ref={ta} value={value} spellCheck={false} onChange={e=>onChange(e.target.value)} onScroll={e=>{hl.current.scrollTop=e.target.scrollTop}}
      style={{...box,position:"absolute",inset:0,width:"100%",height:"100%",resize:"none",outline:"none",background:"transparent",color:"transparent",caretColor:"var(--fg-1)"}}/>
    <TemplateEditor.Ref r={ta}/>
  </div>;
}
TemplateEditor.Ref=function({r}){window.__ddTemplateRef=r;return null;};
function TemplatesScreen({s,a}){
  const {Card,Button,StatusBadge,Tag,Icon}=window.ZimbraDigestDesignSystem_9514e4;
  const [text,setText]=React.useState(s.template);
  React.useEffect(()=>setText(s.template),[s.template,s.templateEditing]);
  const insert=v=>{const el=window.__ddTemplateRef&&window.__ddTemplateRef.current;if(!el){setText(text+v);return;}const p=el.selectionStart;setText(text.slice(0,p)+v+text.slice(el.selectionEnd));setTimeout(()=>{el.focus();el.selectionStart=el.selectionEnd=p+v.length},0);};
  const vars=["date","name","role","tasks","topics","weekly_plans","blockers","tomorrow"];
  if(false)return <div style={{flex:1,display:"flex",flexDirection:"column"}}>
    <PageHeader title="Templates"/>
    <div style={{padding:28,maxWidth:720}}>
      <Card padding={20}><div style={{display:"flex",alignItems:"center",gap:16}}>
        <span style={{width:40,height:40,borderRadius:"var(--radius-sm)",background:"var(--ink-4)",display:"grid",placeItems:"center",color:"var(--fg-2)"}}><Icon name="layout-template" size={18}/></span>
        <div style={{flex:1}}><div style={{font:"600 15px/1.3 var(--font-sans)"}}>Daily Digest</div><div style={{font:"var(--text-meta)",color:"var(--fg-3)",marginTop:3}}>Used for daily work reports</div></div>
        <StatusBadge status="sent" label="Active" size="sm"/>
        <Button variant="primary" icon="pencil" onClick={a.editTemplate}>Edit Template</Button>
      </div></Card>
    </div>
  </div>;
  const preview=DD.render(text,DD.buildVars(DD.sampleNotes,DD.user,DD.today));
  const dirty=text!==s.template;
  window.__ddSaveTemplate=()=>dirty&&a.saveTemplate(text);
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Templates" meta="Daily Digest" right={<div style={{display:"flex",gap:8,alignItems:"center"}}>{dirty&&<span style={{font:"var(--text-meta)",color:"var(--fg-3)"}}>Unsaved changes</span>}<Button variant="ghost" disabled={!dirty} onClick={()=>setText(s.template)}>Cancel</Button><Button variant="primary" icon="check" kbd="⌘S" disabled={!dirty} onClick={()=>a.saveTemplate(text)}>Save Template</Button></div>}/>
    <div style={{flex:1,minHeight:0,display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)"}}>
      <div style={{display:"flex",flexDirection:"column",gap:14,padding:"18px 28px 24px",borderRight:"1px solid var(--border-subtle)",minHeight:0}}>
        <Overline>Daily Digest format</Overline>
        <TemplateEditor value={text} onChange={setText}/>
        <div><div style={{font:"500 12px/1.2 var(--font-sans)",color:"var(--fg-2)",marginBottom:8}}>Available variables <span style={{color:"var(--fg-3)",fontWeight:400}}>· click to insert</span></div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{vars.map(v=><Tag key={v} mono tone="accent" onClick={()=>insert("{"+v+"}")}>{"{"+v+"}"}</Tag>)}</div></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14,padding:"18px 28px 24px",background:"var(--surface-sunken)",minHeight:0}}>
        <div style={{display:"flex",justifyContent:"space-between"}}><Overline>Preview</Overline><span style={{font:"var(--text-meta)",color:"var(--fg-3)"}}>Filled with sample notes</span></div>
        <div style={{flex:1,overflowY:"auto"}}><DigestDocument blocks={preview} subject={"Daily Digest - "+DD.fmt(DD.today)} to={DD.recipient}/></div>
      </div>
    </div>
  </div>;
}
window.TemplatesScreen=TemplatesScreen;
