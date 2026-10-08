export interface ModalProps{
  open?:boolean;title:React.ReactNode;description?:React.ReactNode;
  /** Esc and scrim click call this */
  onClose?:()=>void;width?:number;
  /** right-aligned buttons; put the primary last */
  footer?:React.ReactNode;children?:React.ReactNode;
  /** position:fixed to viewport instead of absolute in nearest positioned parent */
  fixed?:boolean;
}
export declare function Modal(props:ModalProps):JSX.Element;
