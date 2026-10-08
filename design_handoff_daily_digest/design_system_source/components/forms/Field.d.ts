export interface FieldProps{
  label?:React.ReactNode;
  helper?:React.ReactNode;
  /** error text; turns the helper red */
  error?:React.ReactNode;
  /** right-aligned label hint, e.g. "Optional" */
  hint?:React.ReactNode;
  children:React.ReactNode;
}
export declare function Field(props:FieldProps):JSX.Element;
