export interface RadioCardProps{checked?:boolean;onChange?:()=>void;title:React.ReactNode;description?:React.ReactNode;/** small right label, e.g. "Recommended" */badge?:React.ReactNode;/** "warning" tints the checked state amber */tone?:"default"|"warning";}
export declare function RadioCard(props:RadioCardProps):JSX.Element;
