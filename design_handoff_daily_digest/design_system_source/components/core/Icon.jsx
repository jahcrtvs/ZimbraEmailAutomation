import React from "react";
function toPascal(n){return String(n).split(/[-_ ]/).map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join("");}
export function Icon({name,size=18,strokeWidth=1.75,color="currentColor",style}){
  const lib=typeof window!=="undefined"&&window.lucide;
  let node=lib&&lib.icons&&(lib.icons[toPascal(name)]||lib.icons[name]);
  if(node&&!Array.isArray(node[0])&&Array.isArray(node[2]))node=node[2];
  const kids=Array.isArray(node)?node.map(([tag,attrs],i)=>React.createElement(tag,{key:i,...attrs})):null;
  return React.createElement("svg",{width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:color,strokeWidth,strokeLinecap:"round",strokeLinejoin:"round",style:{flexShrink:0,display:"block",...style},"aria-hidden":true},kids);
}
