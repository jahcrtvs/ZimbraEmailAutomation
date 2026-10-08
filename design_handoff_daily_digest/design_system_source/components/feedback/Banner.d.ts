export interface BannerProps{tone?:"warning"|"danger"|"info"|"success";title:React.ReactNode;children?:React.ReactNode;actions?:React.ReactNode;/** technical text hidden behind a "View details" toggle */details?:string;}
export declare function Banner(props:BannerProps):JSX.Element;
