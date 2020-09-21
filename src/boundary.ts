// tslint:disable: variable-name
import { BPMNActivityStatus, BPMNEventIntermediateType } from './enums';

export class BPMNBoundaryEvent {
  _id: string;
  _attachedToRef: string;
  outgoing: string;

  status?: BPMNActivityStatus;
  intermediateType?: BPMNEventIntermediateType;

  paused_at?: Date;
  entered_at?: Date;
  started_at?: Date;
  stopped_at?: Date;
  finished_at?: Date;
  canceled_at?: Date;

  pause(): BPMNBoundaryEvent {
    this.status = BPMNActivityStatus.Paused;
    this.paused_at = new Date();
    return this;
  }

  enter(): BPMNBoundaryEvent {
    this.status = BPMNActivityStatus.Entered;
    this.entered_at = new Date();
    return this;
  }

  start(): BPMNBoundaryEvent {
    this.status = BPMNActivityStatus.Started;
    this.started_at = new Date();
    return this;
  }

  stop(): BPMNBoundaryEvent {
    this.status = BPMNActivityStatus.Stopped;
    this.stopped_at = new Date();
    return this;
  }

  finish(): BPMNBoundaryEvent {
    this.status = BPMNActivityStatus.Finished;
    this.finished_at = new Date();
    return this;
  }

  cancel(): BPMNBoundaryEvent {
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

  constructor(partial?: Partial<BPMNBoundaryEvent>) {
    Object.assign(this, partial);
  }
}
