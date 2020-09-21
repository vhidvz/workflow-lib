export class BPMNLaneArtifact {
  _id!: string;
  _name?: string;
  flowNodeRef?: string[];

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  constructor(partial?: Partial<BPMNLaneArtifact>) {
    Object.assign(this, partial);
  }
}
