export interface AppSidebarItem{id:string;label:string;icon:string;/** shortcut hint shown on hover */kbd?:string;count?:number;countTone?:"accent"|"neutral"|"info";}
export interface AppSidebarProps{items:AppSidebarItem[];value?:string;onChange?:(id:string)=>void;connected?:boolean;onConnectionClick?:()=>void;footer?:React.ReactNode;}
export declare function AppSidebar(props:AppSidebarProps):JSX.Element;
