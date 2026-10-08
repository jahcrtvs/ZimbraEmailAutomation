import React from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "../core/Button.jsx";
import { Icon } from "../core/Icon.jsx";
export function ConfirmDialog({open=true,tone="default",icon,title,description,confirmLabel="Confirm",cancelLabel="Cancel",onConfirm,onCancel,loading,children,fixed}){
  const c={default:"var(--orange-500)",warning:"var(--status-warning)",danger:"var(--status-danger)"}[tone];
  const bg={default:"var(--tint-accent)",warning:"var(--tint-warning)",danger:"var(--tint-danger)"}[tone];
  return <Modal open={open} fixed={fixed} onClose={onCancel} width={420} title={<span style={{display:"flex",flexDirection:"column",gap:14}}>{icon&&<span style={{width:36,height:36,borderRadius:"50%",background:bg,color:c,display:"grid",placeItems:"center"}}><Icon name={icon} size={18}/></span>}{title}</span>} description={description}
    footer={<><Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button><Button variant={tone==="danger"?"danger":"primary"} loading={loading} onClick={onConfirm} style={tone==="warning"?{background:"var(--status-warning)"}:undefined}>{confirmLabel}</Button></>}>{children}</Modal>;
}
