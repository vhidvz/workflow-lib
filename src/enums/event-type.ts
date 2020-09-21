export enum BPMNEventType {
  Start = 'start',
  IntermediateThrow = 'intermediate_throw',
  IntermediateCatch = 'intermediate_catch',
  End = 'end',
}

export enum BPMNEventIntermediateType {
  Error = 'error',
  Signal = 'signal',
  Message = 'message',
  Normal = 'normal',
  Timer = 'timer',
}
