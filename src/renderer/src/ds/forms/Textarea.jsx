import React from "react";
import { Field, fieldBox } from "./Field.jsx";
export function Textarea({label,helper,error,hint,placeholder,value,onChange,rows=3,disabled,mono,autoFocus,textareaRef,style}){
  const [f,setF]=React.useState(false);
  return <Field label={label} helper={helper} error={error} hint={hint}>
    <span style={{...fieldBox({focus:f,error,disabled}),alignItems:"stretch",padding:0,...style}}>
      <textarea ref={textareaRef} rows={rows} value={value} disabled={disabled} autoFocus={autoFocus} placeholder={placeholder} onChange={e=>onChange&&onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{flex:1,minWidth:0,resize:"vertical",background:"transparent",border:0,outline:0,color:"var(--fg-1)",font:mono?"400 13px/1.6 var(--font-mono)":"var(--text-body)",padding:"9px 12px"}}/>
    </span>
  </Field>;
}
