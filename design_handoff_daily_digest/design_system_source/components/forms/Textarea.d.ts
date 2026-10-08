export interface TextareaProps{
  label?:React.ReactNode;helper?:React.ReactNode;error?:React.ReactNode;hint?:React.ReactNode;
  placeholder?:string;value?:string;onChange?:(v:string)=>void;rows?:number;disabled?:boolean;
  /** monospace text, for template editing */
  mono?:boolean;autoFocus?:boolean;textareaRef?:any;style?:React.CSSProperties;
}
export declare function Textarea(props:TextareaProps):JSX.Element;
