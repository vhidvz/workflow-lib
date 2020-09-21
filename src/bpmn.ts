export type BPMNActivityDocType = {
  _id: string;
  _name?: string;
  outgoing?: string[] | string;
  incoming?: string[] | string;
};

export type BPMNFlowDocType = {
  _id: string;
  _sourceRef: string;
  _targetRef: string;
};

export type BPMNLaneDocType = {
  _id: string;
  _name?: string;
  flowNodeRef: string[];
};

export type BPMNBoundaryEventDocType = {
  _id: string;
  _attachedToRef: string;
  outgoing: string;
};

export type BPMNProcessDocType = {
  _id: string;
  _isExecutable: boolean;
  startEvent: BPMNActivityDocType;
  endEvent: BPMNActivityDocType | BPMNActivityDocType[];
  laneSet?: {
    _id: string;
    lane: BPMNLaneDocType | BPMNLaneDocType[];
  };
  task?: BPMNActivityDocType | BPMNActivityDocType[];
  userTask?: BPMNActivityDocType | BPMNActivityDocType[];
  sequenceFlow?: BPMNFlowDocType | BPMNFlowDocType[];
  manualTask?: BPMNActivityDocType | BPMNActivityDocType[];
  scriptTask?: BPMNActivityDocType | BPMNActivityDocType[];
  serviceTask?: BPMNActivityDocType | BPMNActivityDocType[];
  complexGateway?: BPMNActivityDocType | BPMNActivityDocType[];
  parallelGateway?: BPMNActivityDocType | BPMNActivityDocType[];
  exclusiveGateway?: BPMNActivityDocType | BPMNActivityDocType[];
  inclusiveGateway?: BPMNActivityDocType | BPMNActivityDocType[];
  boundaryEvent?: BPMNBoundaryEventDocType | BPMNBoundaryEventDocType[];
  intermediateThrowEvent?: BPMNActivityDocType | BPMNActivityDocType[];
  intermediateCatchEvent?: BPMNActivityDocType | BPMNActivityDocType[];
};
