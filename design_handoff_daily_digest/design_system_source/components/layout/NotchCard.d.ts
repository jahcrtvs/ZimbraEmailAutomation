/**
 * Signature card: rounded surface with its top-right corner cut away to hold circular actions.
 */
export interface NotchCardProps{
  children?:React.ReactNode;
  /** orange filled variant for the active / next-up item */
  accent?:boolean;
  /** Lucide names rendered as IconButtons in the notch; default ["arrow-up-right"] */
  actions?:string[];
  onAction?:(name:string)=>void;
  width?:number|string;
  minHeight?:number;
  onClick?:()=>void;
  style?:React.CSSProperties;
}
export declare function NotchCard(props:NotchCardProps):JSX.Element;
