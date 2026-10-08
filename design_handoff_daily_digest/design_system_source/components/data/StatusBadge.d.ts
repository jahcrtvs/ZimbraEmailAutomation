export type DigestStatus="none"|"draft"|"generating"|"ready"|"scheduled"|"sending"|"sent"|"failed"|"cancelled"|"missed";
export interface StatusBadgeProps{
  status?:DigestStatus;
  /** override default label */
  label?:string;
  /** appended after a middle dot, e.g. "5:00 PM" */
  detail?:string;
  size?:"sm"|"md";
}
export declare function StatusBadge(props:StatusBadgeProps):JSX.Element;
