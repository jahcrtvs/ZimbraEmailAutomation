export interface DatePickerProps{label?:React.ReactNode;helper?:React.ReactNode;value?:Date;onChange?:(d:Date)=>void;/** earlier days disabled */minDate?:Date;style?:React.CSSProperties;}
export declare function DatePicker(props:DatePickerProps):JSX.Element;
export declare function formatDate(d:Date):string;
