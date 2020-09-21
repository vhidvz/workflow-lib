import { BPMNTaskType, BPMNActivityCategory } from '../enums';
import { findLastActivityFromStackById } from '../utils';
import { BPMNGatewayActivity, FlowIO } from './gateway';
import { BPMNBoundaryEvent } from '../boundary';
import { BPMNException } from '../exception';
import { BPMNEventActivity } from './event';
import { BPMNActivity } from '../activity';

export class BPMNTaskActivity extends BPMNActivity {
  type!: BPMNTaskType;

  boundaryEvent?: BPMNBoundaryEvent;

  takeBoundaryEvent(): void {
    if (this.boundaryEvent) {
      for (const flow of this.flows) {
        if (flow._sourceRef === this.boundaryEvent._id) {
          for (const activity of this.activities) {
            if (flow._targetRef === activity._id) {
              let next = findLastActivityFromStackById(activity._id, this.engine.history.stack);
              if (!next) {
                switch (activity.category) {
                  case BPMNActivityCategory.Event:
                    next = new BPMNEventActivity(activity as BPMNEventActivity).enter();
                    break;
                  case BPMNActivityCategory.Gateway:
                    next = new BPMNGatewayActivity(activity as BPMNGatewayActivity).enter();

                    if (Array.isArray((next as BPMNGatewayActivity).io_incoming)) {
                      for (let i = 0; i < ((next as BPMNGatewayActivity).io_incoming as FlowIO[]).length; i++) {
                        if (this.boundaryEvent.outgoing === (next as BPMNGatewayActivity).io_incoming[i].id) {
                          (next as BPMNGatewayActivity).io_incoming[i].isTaken = true;
                          break;
                        }
                      }
                    } else {
                      if (this.boundaryEvent.outgoing === ((next as BPMNGatewayActivity).io_incoming as FlowIO).id) {
                        ((next as BPMNGatewayActivity).io_incoming as FlowIO).isTaken = true;
                      }
                    }

                    break;
                  case BPMNActivityCategory.Task:
                    next = new BPMNTaskActivity(activity as BPMNTaskActivity).enter();
                    break;
                }
              } else {
                switch (activity.category) {
                  case BPMNActivityCategory.Event:
                    next = new BPMNEventActivity(next as BPMNEventActivity).enter();
                    break;
                  case BPMNActivityCategory.Gateway:
                    next = new BPMNGatewayActivity(next as BPMNGatewayActivity).enter();

                    (next as BPMNGatewayActivity).refreshAllOutgoing();

                    if (Array.isArray((next as BPMNGatewayActivity).io_incoming)) {
                      for (let i = 0; i < ((next as BPMNGatewayActivity).io_incoming as FlowIO[]).length; i++) {
                        if (this.boundaryEvent.outgoing === (next as BPMNGatewayActivity).io_incoming[i].id) {
                          (next as BPMNGatewayActivity).io_incoming[i].isTaken = true;
                          break;
                        }
                      }
                    } else {
                      if (this.boundaryEvent.outgoing === ((next as BPMNGatewayActivity).io_incoming as FlowIO).id) {
                        ((next as BPMNGatewayActivity).io_incoming as FlowIO).isTaken = true;
                      }
                    }

                    break;
                  case BPMNActivityCategory.Task:
                    next = new BPMNTaskActivity(next as BPMNTaskActivity).enter();
                    break;
                }
              }
              this.engine.history.head.push(next);
            }
          }
        }
      }
    } else {
      throw new BPMNException(`${this._id} task with name ${this._name} does not have a boundary event.`);
    }
  }

  isUser(): boolean {
    return this.type === BPMNTaskType.User;
  }

  isManual(): boolean {
    return this.type === BPMNTaskType.Manual;
  }

  isNormal(): boolean {
    return this.type === BPMNTaskType.Normal;
  }

  isService(): boolean {
    return this.type === BPMNTaskType.Service;
  }

  isScript(): boolean {
    return this.type === BPMNTaskType.Script;
  }

  constructor(partial?: Partial<BPMNTaskActivity>) {
    super();
    Object.assign(this, partial);
  }
}
