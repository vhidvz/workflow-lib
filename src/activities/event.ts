import { BPMNEventType, BPMNEventIntermediateType } from '../enums';
import { BPMNActivity } from '../activity';

export class BPMNEventActivity extends BPMNActivity {
  type: BPMNEventType;

  intermediateType?: BPMNEventIntermediateType;

  isStart(): boolean {
    return this.type === BPMNEventType.Start;
  }

  isIntermediateThrow(): boolean {
    return this.type === BPMNEventType.IntermediateThrow;
  }

  isIntermediateCatch(): boolean {
    return this.type === BPMNEventType.IntermediateCatch;
  }

  isEnd(): boolean {
    return this.type === BPMNEventType.End;
  }

  constructor(partial?: Partial<BPMNEventActivity>) {
    super();
    Object.assign(this, partial);
  }
}
