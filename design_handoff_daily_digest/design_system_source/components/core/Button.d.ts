export interface ButtonProps{
  /** primary = orange (one per screen), inverse = white, secondary = grey fill, outline, ghost, danger */
  variant?:"primary"|"inverse"|"secondary"|"outline"|"ghost"|"danger";
  size?:"sm"|"md"|"lg";
  icon?:string;
  iconRight?:string;
  /** shows a spinner and blocks clicks */
  loading?:boolean;
  disabled?:boolean;
  /** shortcut hint rendered inside the button, e.g. "⌘↵" */
  kbd?:string;
  full?:boolean;
  type?:"button"|"submit";
  children?:React.ReactNode;
  onClick?:(e:any)=>void;
  style?:React.CSSProperties;
}
export declare function Button(props:ButtonProps):JSX.Element;
