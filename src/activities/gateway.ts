// tslint:disable: variable-name
import { BPMNActivity, BPMNGeneralActivity, next } from '../activity';
import { getActivityById, getActivityByName } from '../utils';
import { BPMNException } from '../exception';
import { BPMNGatewayType } from '../enums';

export type FlowIO = { id: string; isTaken: boolean };

export const getFlowIO = (values: string | string[] | undefined): FlowIO | FlowIO[] => {
  if (!values) return;
  let result: FlowIO | FlowIO[];
  if (Array.isArray(values)) {
    result = [];
    for (const value of values) {
      result.push({ id: value, isTaken: false });
    }
  } else {
    result = { id: values, isTaken: false };
  }
  return result;
};

export const itHasOnlyOneIo = (IOs: FlowIO | FlowIO[]): boolean => {
  if (Array.isArray(IOs)) {
    return false;
  } else {
    return true;
  }
};

export const isOneOfIoTaken = (IOs: FlowIO | FlowIO[]): boolean => {
  let flag = false;
  if (Array.isArray(IOs)) {
    for (const IO of IOs) {
      flag = IO.isTaken || flag;
      if (flag) return true;
    }
  } else {
    flag = (IOs as FlowIO).isTaken;
  }
  return flag;
};

export const isOnlyOneOfIoTaken = (IOs: FlowIO | FlowIO[]): boolean => {
  if (Array.isArray(IOs)) {
    let counter = 0;
    for (const IO of IOs) {
      if (IO.isTaken) counter++;
    }
    if (counter === 1) return true;
    else return false;
  } else {
    return (IOs as FlowIO).isTaken;
  }
};

export const isAllOfIoTaken = (IOs: FlowIO | FlowIO[]): boolean => {
  let flag = true;
  if (Array.isArray(IOs)) {
    for (const IO of IOs) {
      flag = IO.isTaken && flag;
      if (!flag) return false;
    }
  } else {
    flag = (IOs as FlowIO).isTaken;
  }
  return flag;
};

export const isAnyOfIoTaken = (IOs: FlowIO | FlowIO[]): boolean => {
  if (Array.isArray(IOs)) {
    for (const IO of IOs) {
      if (IO.isTaken) return true;
    }
  } else {
    return (IOs as FlowIO).isTaken;
  }
};

export const gatewayApplicableOutgoing = (type: BPMNGatewayType, io_outgoing: FlowIO | FlowIO[]): string | string[] => {
  switch (type) {
    case BPMNGatewayType.Complex:
      if (Array.isArray(io_outgoing)) {
        const result: string | string[] = [];
        for (const outgoing of io_outgoing) {
          if (outgoing.isTaken) {
            result.push(outgoing.id);
          }
        }
        return result;
      } else {
        io_outgoing.isTaken = true;
        return io_outgoing.id;
      }
      break;
    case BPMNGatewayType.Exclusive:
      if (Array.isArray(io_outgoing)) {
        for (const outgoing of io_outgoing) {
          if (outgoing.isTaken) {
            return outgoing.id;
          }
        }
      } else {
        io_outgoing.isTaken = true;
        return io_outgoing.id;
      }
      break;
    case BPMNGatewayType.Inclusive:
      if (Array.isArray(io_outgoing)) {
        const result: string | string[] = [];
        for (const outgoing of io_outgoing) {
          if (outgoing.isTaken) {
            result.push(outgoing.id);
          }
        }
        return result;
      } else {
        io_outgoing.isTaken = true;
        return io_outgoing.id;
      }
      break;
  }
};

export class BPMNGatewayActivity extends BPMNActivity {
  type: BPMNGatewayType;

  io_outgoing?: FlowIO | FlowIO[];
  io_incoming?: FlowIO | FlowIO[];

  next(): BPMNGeneralActivity[] {
    const _outgoing = gatewayApplicableOutgoing(this.type, this.io_outgoing);
    switch (this.type) {
      case BPMNGatewayType.Complex:
        if (_outgoing) {
          return next(_outgoing, this.flows, this.activities, this.engine.history.head || undefined);
        }
        break;
      case BPMNGatewayType.Exclusive:
        if (_outgoing && isOneOfIoTaken(this.io_incoming)) {
          return next(_outgoing, this.flows, this.activities, this.engine.history.head || undefined);
        }
        break;
      case BPMNGatewayType.Inclusive:
        if (_outgoing && isAllOfIoTaken(this.io_incoming)) {
          return next(_outgoing, this.flows, this.activities, this.engine.history.head || undefined);
        }
        break;
      case BPMNGatewayType.Parallel:
        if (isAllOfIoTaken(this.io_incoming)) {
          return next(this.outgoing, this.flows, this.activities, this.engine.history.head || undefined);
        }
        break;
    }
  }

  refreshAllOutgoing(): BPMNGatewayActivity {
    if (Array.isArray(this.io_outgoing)) {
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.io_outgoing.length; i++) {
        this.io_outgoing[i].isTaken = false;
      }
    } else {
      this.io_outgoing.isTaken = false;
    }
    return this;
  }

  takeOutgoingById(activityId: string): BPMNGatewayActivity {
    if (this.type === BPMNGatewayType.Parallel) {
      throw new BPMNException(
        `takeOutgoingById([Activity: ${activityId}]) only works on inclusive, exclusive and complex gateways.`,
      );
    }
    const activity = getActivityById(activityId, this.activities);
    if (activity) {
      if (Array.isArray(this.io_outgoing)) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.io_outgoing.length; i++) {
          if (Array.isArray(activity.incoming)) {
            if (activity.incoming.includes(this.io_outgoing[i].id)) {
              this.io_outgoing[i].isTaken = true;
              return this;
            }
          } else {
            if (activity.incoming === this.io_outgoing[i].id) {
              this.io_outgoing[i].isTaken = true;
              return this;
            }
          }
        }
      } else {
        if (Array.isArray(activity.incoming)) {
          if (activity.incoming.includes(this.io_outgoing.id)) {
            this.io_outgoing.isTaken = true;
            return this;
          }
        } else {
          if (activity.incoming === this.io_outgoing.id) {
            this.io_outgoing.isTaken = true;
            return this;
          }
        }
      }
    } else {
      throw new BPMNException(`takeOutgoingById([Activity: ${activityId}]) outgoing activity not found.`);
    }
  }

  takeOutgoingByName(activityName: string): BPMNGatewayActivity {
    if (this.type === BPMNGatewayType.Parallel) {
      throw new BPMNException(
        `takeOutgoingByName([Activity: ${activityName}]) only works on inclusive, exclusive and complex gateways.`,
      );
    }
    const activity = getActivityByName(activityName, this.activities);
    if (activity) {
      if (Array.isArray(this.io_outgoing)) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.io_outgoing.length; i++) {
          if (Array.isArray(activity.incoming)) {
            if (activity.incoming.includes(this.io_outgoing[i].id)) {
              this.io_outgoing[i].isTaken = true;
              return this;
            }
          } else {
            if (activity.incoming === this.io_outgoing[i].id) {
              this.io_outgoing[i].isTaken = true;
              return this;
            }
          }
        }
      } else {
        if (Array.isArray(activity.incoming)) {
          if (activity.incoming.includes(this.io_outgoing.id)) {
            this.io_outgoing.isTaken = true;
            return this;
          }
        } else {
          if (activity.incoming === this.io_outgoing.id) {
            this.io_outgoing.isTaken = true;
            return this;
          }
        }
      }
    } else {
      throw new BPMNException(`takeOutgoingByName([Activity: ${activityName}]) outgoing activity not found.`);
    }
  }

  isInclusive(): boolean {
    return this.type === BPMNGatewayType.Inclusive;
  }

  isExclusive(): boolean {
    return this.type === BPMNGatewayType.Exclusive;
  }

  isParallel(): boolean {
    return this.type === BPMNGatewayType.Parallel;
  }

  isComplex(): boolean {
    return this.type === BPMNGatewayType.Complex;
  }

  constructor(partial?: Partial<BPMNGatewayActivity>) {
    super();
    this.io_incoming = getFlowIO(partial.incoming);
    this.io_outgoing = getFlowIO(partial.outgoing);
    Object.assign(this, partial);
  }
}
