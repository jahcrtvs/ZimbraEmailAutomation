export interface IconProps{
  /** Lucide icon name, kebab or Pascal case, e.g. "arrow-up-right" */
  name:string;
  size?:number;
  strokeWidth?:number;
  color?:string;
  style?:React.CSSProperties;
}
export declare function Icon(props:IconProps):JSX.Element;
