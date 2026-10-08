export interface SelectOption{value:string;label:React.ReactNode;}
export interface SelectProps{label?:React.ReactNode;helper?:React.ReactNode;value?:string;options:(string|SelectOption)[];onChange?:(v:string)=>void;disabled?:boolean;style?:React.CSSProperties;}
export declare function Select(props:SelectProps):JSX.Element;
