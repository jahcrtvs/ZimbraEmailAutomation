export interface IconButtonProps{
  icon:string;
  variant?:"ghost"|"outline"|"filled"|"inverse";
  size?:number;
  dot?:boolean|string;
  active?:boolean;
  label?:string;
  onClick?:(e:any)=>void;
  style?:React.CSSProperties;
}
export declare function IconButton(props:IconButtonProps):JSX.Element;
