import React from "react";
import { IconButton } from "../core/IconButton.jsx";
const FOCUSABLE='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
export function Modal({open=true,title,description,onClose,width=440,footer,children,fixed}){
  const titleId=React.useId();
  const panelRef=React.useRef(null);
  React.useEffect(()=>{if(!open)return;const h=e=>{
    if(e.key==="Escape"&&onClose){onClose();return}
    if(e.key==="Tab"&&panelRef.current){
      const els=[...panelRef.current.querySelectorAll(FOCUSABLE)].filter(el=>!el.disabled);
      if(!els.length){e.preventDefault();panelRef.current.focus();return}
      const first=els[0],last=els[els.length-1],a=document.activeElement;
      if(e.shiftKey&&(a===first||!panelRef.current.contains(a))){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&(a===last||!panelRef.current.contains(a))){e.preventDefault();first.focus()}
    }};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[open,onClose]);
  React.useEffect(()=>{if(!open)return;const prev=document.activeElement;
    const p=panelRef.current;if(p){const f=p.querySelector(FOCUSABLE);(f||p).focus()}
    return()=>{if(prev&&prev.focus)prev.focus()}},[open]);
  if(!open)return null;
  return <div onMouseDown={e=>{if(e.target===e.currentTarget&&onClose)onClose()}} style={{position:fixed?"fixed":"absolute",inset:0,zIndex:100,background:"var(--overlay-scrim)",display:"grid",placeItems:"center",padding:24}}>
    <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{width,maxWidth:"100%",borderRadius:"var(--radius-xl)",background:"var(--ink-3)",boxShadow:"var(--shadow-pop)",animation:"dd-pop var(--dur-base) var(--ease-out)",overflow:"hidden",outline:"none"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"20px 20px 0 24px"}}>
        <div style={{flex:1,paddingTop:4}}>
          <div id={titleId} style={{font:"600 16px/1.3 var(--font-sans)",color:"var(--fg-1)"}}>{title}</div>
          {description&&<div style={{font:"var(--text-body)",color:"var(--fg-2)",marginTop:6,textWrap:"pretty"}}>{description}</div>}
        </div>
        {onClose&&<IconButton icon="x" label="Close (Esc)" onClick={onClose}/>}
      </div>
      {children&&<div style={{padding:"20px 24px 0"}}>{children}</div>}
      {footer&&<div style={{display:"flex",justifyContent:"flex-end",gap:8,padding:"24px 24px 24px"}}>{footer}</div>}
    </div>
  </div>;
}
