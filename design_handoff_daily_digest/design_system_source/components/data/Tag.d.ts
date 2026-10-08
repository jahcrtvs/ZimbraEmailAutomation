export interface TagProps{children:React.ReactNode;/** monospace, for template variables */mono?:boolean;tone?:"neutral"|"accent";onClick?:()=>void;style?:React.CSSProperties;}
export declare function Tag(props:TagProps):JSX.Element;
