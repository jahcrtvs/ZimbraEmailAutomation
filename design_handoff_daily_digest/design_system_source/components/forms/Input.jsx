import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Field, fieldBox } from "./Field.jsx";
export function Input({label,helper,error,hint,icon,placeholder,value,defaultValue,onChange,type="text",disabled,readOnly,style}){
  const [f,setF]=React.useState(false);
  return <Field label={label} helper={helper} error={error} hint={hint}>
    <span style={{...fieldBox({focus:f,error,disabled}),...style}}>
      {icon&&<Icon name={icon} size={15}/>}
      <input type={type} value={value} defaultValue={defaultValue} disabled={disabled} readOnly={readOnly} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{flex:1,minWidth:0,height:34,background:"transparent",border:0,outline:0,color:"var(--fg-1)",font:"var(--text-body)",padding:0}}/>
      {error&&<Icon name="circle-alert" size={15} color="var(--status-danger)"/>}
    </span>
  </Field>;
}
