export interface TimePickerProps{label?:React.ReactNode;helper?:React.ReactNode;/** "5:00 PM" format */value?:string;onChange?:(t:string)=>void;/** minutes between options, default 15 */step?:number;style?:React.CSSProperties;}
export declare function TimePicker(props:TimePickerProps):JSX.Element;
