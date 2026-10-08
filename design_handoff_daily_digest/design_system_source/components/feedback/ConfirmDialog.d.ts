export interface ConfirmDialogProps{
  open?:boolean;tone?:"default"|"warning"|"danger";icon?:string;
  title:React.ReactNode;description?:React.ReactNode;confirmLabel?:string;cancelLabel?:string;
  onConfirm?:()=>void;onCancel?:()=>void;loading?:boolean;children?:React.ReactNode;fixed?:boolean;
}
export declare function ConfirmDialog(props:ConfirmDialogProps):JSX.Element;
