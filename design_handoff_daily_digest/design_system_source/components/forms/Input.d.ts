export interface InputProps{
  label?:React.ReactNode;helper?:React.ReactNode;error?:React.ReactNode;hint?:React.ReactNode;
  icon?:string;placeholder?:string;value?:string;defaultValue?:string;onChange?:(v:string)=>void;
  type?:string;disabled?:boolean;readOnly?:boolean;style?:React.CSSProperties;
}
export declare function Input(props:InputProps):JSX.Element;
