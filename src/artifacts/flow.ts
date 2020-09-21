export class BPMNFlowArtifact {
  _id!: string;
  _sourceRef!: string;
  _targetRef!: string;

  constructor(partial?: Partial<BPMNFlowArtifact>) {
    Object.assign(this, partial);
  }
}
