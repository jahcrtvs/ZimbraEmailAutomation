export interface CardProps{title?:React.ReactNode;subtitle?:React.ReactNode;actions?:React.ReactNode;children?:React.ReactNode;/** px, default 20 */padding?:number;onClick?:()=>void;/** orange outline */selected?:boolean;style?:React.CSSProperties;}
export declare function Card(props:CardProps):JSX.Element;
