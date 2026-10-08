import React from "react";
import { IconButton } from "../core/IconButton.jsx";
export function NotchCard({children,accent,actions=["arrow-up-right"],onAction,width,minHeight=150,onClick,style}){
  const [h,setH]=React.useState(false);
  const n=actions.length,btn=36,gap=4,pad=4,r=18;
  const cutW=n*btn+(n-1)*gap+pad*2+2,cutH=btn+pad*2+2;
  const bg=accent?"var(--surface-accent)":h&&onClick?"var(--surface-card-hover)":"var(--surface-card)";
  const piece={position:"absolute",background:bg,transition:"background var(--dur-base)"};
  if(!n)return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{position:"relative",width,minHeight,boxSizing:"border-box",borderRadius:r,background:bg,transition:"background var(--dur-base)",cursor:onClick?"pointer":"default",...style}}><div style={{position:"relative",padding:"16px 16px 14px",color:accent?"var(--fg-on-accent)":"var(--fg-1)"}}>{children}</div></div>;
  return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{position:"relative",width,minHeight,cursor:onClick?"pointer":"default",...style}}>
    <div style={{...piece,left:0,top:0,width:`calc(100% - ${cutW}px)`,height:cutH+r,borderRadius:`${r}px ${r}px 0 0`}}/>
    <div style={{...piece,left:0,right:0,top:cutH,bottom:0,borderRadius:`0 ${r}px ${r}px ${r}px`}}/>
    <div style={{...piece,left:`calc(100% - ${cutW}px)`,top:cutH-r,width:r,height:r,WebkitMask:`radial-gradient(circle at 100% 0,transparent ${r-.5}px,#000 ${r}px)`,mask:`radial-gradient(circle at 100% 0,transparent ${r-.5}px,#000 ${r}px)`}}/>
    <div style={{position:"absolute",top:pad-2,right:pad-2,display:"flex",gap}}>
      {actions.map(a=><IconButton key={a} icon={a} variant="outline" size={btn} onClick={e=>{e&&e.stopPropagation&&e.stopPropagation();onAction&&onAction(a)}}/>)}
    </div>
    <div style={{position:"relative",padding:"16px 16px 14px",color:accent?"var(--fg-on-accent)":"var(--fg-1)"}}>{children}</div>
  </div>;
}
