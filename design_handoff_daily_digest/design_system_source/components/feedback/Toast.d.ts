export interface ToastProps{tone?:"success"|"info"|"danger"|"warning";message:React.ReactNode;action?:string;onAction?:()=>void;onClose?:()=>void;}
export declare function Toast(props:ToastProps):JSX.Element;
