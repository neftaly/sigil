declare module "react-reconciler" {
  const Reconciler: any;
  export default Reconciler;
}

declare module "react-reconciler/constants.js" {
  export const ConcurrentRoot: number;
  export const DefaultEventPriority: number;
}
