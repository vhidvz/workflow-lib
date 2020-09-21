// tslint:disable: variable-name
import {
  BPMNGatewayActivity,
  FlowIO,
  isOneOfIoTaken,
  isAllOfIoTaken,
  BPMNEventActivity,
  BPMNTaskActivity,
} from './activities';
import { getTargetRefs, getNextActivities, combineWithHeadActivities } from './utils';
import { BPMNActivityStatus, BPMNActivityCategory, BPMNGatewayType } from './enums';
import { BPMNLaneArtifact, BPMNFlowArtifact } from './artifacts';
import { BPMNException } from './exception';
import { BPMNEngine } from '.';

export type BPMNGeneralActivity = BPMNActivity | BPMNTaskActivity | BPMNGatewayActivity | BPMNEventActivity;

export const next = (
  outgoing: string[] | string,
  flows: BPMNFlowArtifact[],
  activities: BPMNGeneralActivity[],
  head?: BPMNGeneralActivity[],
): BPMNGeneralActivity[] => {
  const targetRefs = getTargetRefs(outgoing, flows);
  let nextActivities = getNextActivities(targetRefs, activities);
  nextActivities = combineWithHeadActivities(nextActivities, head || []);
  for (const nextActivity of nextActivities) {
    /**
     * Gateway Category
     */
    if (nextActivity.isGateway()) {
      const io_incoming = (nextActivity as BPMNGatewayActivity).io_incoming;

      if (Array.isArray(io_incoming)) {
        for (let i = 0; i < io_incoming.length; i++) {
          if (outgoing.includes(io_incoming[i].id)) {
            ((nextActivity as BPMNGatewayActivity).io_incoming as FlowIO[])[i].isTaken = true;
            break;
          }
        }
      } else {
        ((nextActivity as BPMNGatewayActivity).io_incoming as FlowIO).isTaken = true;
      }

      switch ((nextActivity as BPMNGatewayActivity).type) {
        case BPMNGatewayType.Complex:
          throw new BPMNException('Does not implemented next function of complex gateway type.');
        case BPMNGatewayType.Exclusive:
          if (isOneOfIoTaken((nextActivity as BPMNGatewayActivity).io_incoming)) {
            (nextActivity as BPMNGatewayActivity).enter();
          } else {
            (nextActivity as BPMNGatewayActivity).pause();
          }
          break;
        case BPMNGatewayType.Inclusive:
          if (isAllOfIoTaken((nextActivity as BPMNGatewayActivity).io_incoming)) {
            (nextActivity as BPMNGatewayActivity).enter();
          } else {
            (nextActivity as BPMNGatewayActivity).pause();
          }
          break;
        case BPMNGatewayType.Parallel:
          if (isAllOfIoTaken((nextActivity as BPMNGatewayActivity).io_incoming)) {
            (nextActivity as BPMNGatewayActivity).enter();
          } else {
            (nextActivity as BPMNGatewayActivity).pause();
          }
          break;
      }
    } else if (nextActivity.isTask()) {
      /**
       * Task Category
       */
      (nextActivity as BPMNTaskActivity).enter();
      if ((nextActivity as BPMNTaskActivity).boundaryEvent) {
        (nextActivity as BPMNTaskActivity).boundaryEvent.enter();
      }
    } else if (nextActivity.isEvent()) {
      /**
       * Event Category
       */
      (nextActivity as BPMNEventActivity).enter();
    }
  }
  return nextActivities;
};

export class BPMNActivity {
  _id: string;
  _name?: string;
  lane?: BPMNLaneArtifact;
  outgoing?: string[] | string;
  incoming?: string[] | string;
  status?: BPMNActivityStatus;
  category: BPMNActivityCategory;

  paused_at?: Date;
  entered_at?: Date;
  started_at?: Date;
  stopped_at?: Date;
  finished_at?: Date;
  canceled_at?: Date;

  flows?: BPMNFlowArtifact[];
  activities?: BPMNGeneralActivity[];

  engine?: BPMNEngine;

  pause(): BPMNGeneralActivity {
    this.status = BPMNActivityStatus.Paused;
    this.paused_at = new Date();
    return this;
  }

  enter(): BPMNGeneralActivity {
    this.status = BPMNActivityStatus.Entered;
    this.entered_at = new Date();
    return this;
  }

  start(): BPMNGeneralActivity {
    this.status = BPMNActivityStatus.Started;
    this.started_at = new Date();
    return this;
  }

  stop(): BPMNGeneralActivity {
    this.status = BPMNActivityStatus.Stopped;
    this.stopped_at = new Date();
    return this;
  }

  finish(): BPMNGeneralActivity {
    this.status = BPMNActivityStatus.Finished;
    this.finished_at = new Date();
    return this;
  }

  cancel(): BPMNGeneralActivity {
    this.status = BPMNActivityStatus.Canceled;
    this.canceled_at = new Date();
    return this;
  }

  isPaused(): boolean {
    return this.status === BPMNActivityStatus.Paused;
  }

  isEntered(): boolean {
    return this.status === BPMNActivityStatus.Entered;
  }

  isStarted(): boolean {
    return this.status === BPMNActivityStatus.Started;
  }

  isStopped(): boolean {
    return this.status === BPMNActivityStatus.Stopped;
  }

  isFinished(): boolean {
    return this.status === BPMNActivityStatus.Finished;
  }

  isCanceled(): boolean {
    return this.status === BPMNActivityStatus.Canceled;
  }

  isTask(): boolean {
    return this.category === BPMNActivityCategory.Task;
  }

  isEvent(): boolean {
    return this.category === BPMNActivityCategory.Event;
  }

  isGateway(): boolean {
    return this.category === BPMNActivityCategory.Gateway;
  }

  stopAllExceptThis(): void {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.engine.history.head.length; i++) {
      if (this.engine.history.head[i]._id !== this._id) {
        this.engine.history.head[i].stop();
      }
    }
  }

  // Gateway Methods - START

  takeOutgoingByName(activityName: string): BPMNGatewayActivity {
    throw new BPMNException(activityName + ': takeOutgoingByName(activityName: string): BPMNGatewayActivity');
  }

  takeOutgoingById(activityName: string): BPMNGatewayActivity {
    throw new BPMNException(activityName + ': takeOutgoingById(activityName: string): BPMNGatewayActivity');
  }

  isInclusive(): boolean {
    throw new BPMNException('isInclusive(): boolean');
  }

  isExclusive(): boolean {
    throw new BPMNException('isExclusive(): boolean');
  }

  isParallel(): boolean {
    throw new BPMNException('isParallel(): boolean');
  }

  isComplex(): boolean {
    throw new BPMNException('isComplex(): boolean');
  }

  refreshAllOutgoing(): BPMNGatewayActivity {
    throw new BPMNException('refreshAllOutgoing(): BPMNGatewayActivity');
  }

  // Gateway Methods - END
  // -----------------------
  // Event Methods - START

  isStart(): boolean {
    throw new BPMNException('isStart(): boolean');
  }

  isIntermediateThrow(): boolean {
    throw new BPMNException('isIntermediateThrow(): boolean');
  }

  isIntermediateCatch(): boolean {
    throw new BPMNException('isIntermediateCatch(): boolean');
  }

  isEnd(): boolean {
    throw new BPMNException('isEnd(): boolean');
  }

  // Event Methods - END
  // -----------------------
  // Task Methods - START

  takeBoundaryEvent(): void {
    throw new BPMNException('takeBoundaryEvent(): void');
  }

  isUser(): boolean {
    throw new BPMNException('isUser(): boolean');
  }

  isManual(): boolean {
    throw new BPMNException('isManual(): boolean');
  }

  isNormal(): boolean {
    throw new BPMNException('isNormal(): boolean');
  }

  isService(): boolean {
    throw new BPMNException('isService(): boolean');
  }

  isScript(): boolean {
    throw new BPMNException('isScript(): boolean');
  }

  // Task Methods - END

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  serialize(): BPMNGeneralActivity {
    const temp = new BPMNActivity(this);
    delete temp.flows;
    delete temp.activities;
    delete temp.engine;
    return temp;
  }

  next(): BPMNGeneralActivity[] {
    if (this.outgoing) {
      return next(this.outgoing, this.flows, this.activities, this.engine.history.head || undefined);
    }
  }

  constructor(partial?: Partial<BPMNActivity>) {
    Object.assign(this, partial);
  }
}
