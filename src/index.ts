// tslint:disable: variable-name
import {
  BPMNEngineState,
  BPMNEventType,
  BPMNActivityCategory,
  BPMNTaskType,
  BPMNGatewayType,
  BPMNActivityStatus,
} from './enums';
import {
  getLane,
  getIntermediateType,
  getBoundaryEvent,
  getActivityById,
  ignoreInHead,
  getActivityByName,
} from './utils';
import {
  BPMNEventActivity,
  BPMNBoundaryEvent,
  BPMNTaskActivity,
  BPMNGatewayActivity,
  isOnlyOneOfIoTaken,
  isOneOfIoTaken,
  isAllOfIoTaken,
  isAnyOfIoTaken,
  itHasOnlyOneIo,
} from './activities';
import { BPMNFlowArtifact, BPMNLaneArtifact } from './artifacts';
import { BPMNGeneralActivity, BPMNActivity } from './activity';
import { BPMNEngineHistory } from './history';
import { BPMNProcessDocType } from './bpmn';
import { BPMNException } from './exception';

export type BPMNEngineSerialize = {
  head: BPMNGeneralActivity[];
  stack: BPMNGeneralActivity[];
  state: BPMNEngineState;
  init_at?: Date;
  pause_at?: Date;
  start_at?: Date;
  stop_at?: Date;
  finish_at?: Date;
  cancel_at?: Date;
};

export interface BPMNInterface {
  StartEvent(activity: BPMNEventActivity, data?);
}

export class BPMNEngine {
  private state: BPMNEngineState;
  public history: BPMNEngineHistory;

  private _init_at: Date;
  private _pause_at: Date;
  private _start_at: Date;
  private _stop_at: Date;
  private _finish_at: Date;
  private _cancel_at: Date;

  private callable: BPMNInterface;
  private flows: BPMNFlowArtifact[] = [];
  private activities: BPMNGeneralActivity[] = [];

  constructor({ process, callable }: { process?: BPMNProcessDocType; callable?: BPMNInterface }) {
    this.initialize();
    this.history = new BPMNEngineHistory();

    if (process) this.build(process);
    if (callable) this.bind(callable);
  }

  public bind(callable: BPMNInterface): void {
    this.callable = callable;

    if (this.callable && this.activities.length && this.flows.length) this.start();
  }

  public build(process: BPMNProcessDocType): void {
    const lanes: BPMNLaneArtifact[] = [];
    const boundaryEvents: BPMNBoundaryEvent[] = [];

    /**
     * LaneSet
     */
    if ('laneSet' in process) {
      if (Array.isArray(process.laneSet.lane)) {
        for (const lane of process.laneSet.lane) {
          lanes.push(new BPMNLaneArtifact(lane));
        }
      } else {
        lanes.push(new BPMNLaneArtifact(process.laneSet.lane));
      }
    }

    /**
     * Start
     */
    if ('startEvent' in process) {
      if (Array.isArray(process.startEvent)) throw new BPMNException('process.startEvent should not be an array.');
      this.history.head.push(
        new BPMNEventActivity({
          ...process.startEvent,
          type: BPMNEventType.Start,
          category: BPMNActivityCategory.Event,
          lane: getLane(process.startEvent._id, lanes),
        }).enter(),
      );
    } else {
      throw new BPMNException('Process should be have only one start event.');
    }

    /**
     * Flows
     */
    if ('sequenceFlow' in process) {
      if (Array.isArray(process.sequenceFlow)) {
        for (const flow of process.sequenceFlow) {
          this.flows.push(new BPMNFlowArtifact(flow));
        }
      } else {
        this.flows.push(new BPMNFlowArtifact(process.sequenceFlow));
      }
    }

    /**
     * BoundaryEvent
     */
    if ('boundaryEvent' in process) {
      if (Array.isArray(process.boundaryEvent)) {
        for (const bEvent of process.boundaryEvent) {
          boundaryEvents.push(new BPMNBoundaryEvent({ ...bEvent, intermediateType: getIntermediateType(bEvent) }));
        }
      } else {
        boundaryEvents.push(
          new BPMNBoundaryEvent({
            ...process.boundaryEvent,
            intermediateType: getIntermediateType(process.boundaryEvent),
          }),
        );
      }
    }

    /**
     * Tasks
     */
    const _compile_task = (activity: string, type: BPMNTaskType) => {
      if (activity in process) {
        if (Array.isArray(process[activity])) {
          for (const task of process[activity]) {
            this.activities.push(
              new BPMNTaskActivity({
                ...task,
                type,
                category: BPMNActivityCategory.Task,
                boundaryEvent: getBoundaryEvent(task._id, boundaryEvents) || undefined,
                lane: getLane(task._id, lanes),
              }),
            );
          }
        } else {
          this.activities.push(
            new BPMNTaskActivity({
              ...process[activity],
              type,
              category: BPMNActivityCategory.Task,
              boundaryEvent: getBoundaryEvent(process[activity]._id, boundaryEvents) || undefined,
              lane: getLane(process[activity]._id, lanes),
            }),
          );
        }
      }
    };

    _compile_task('task', BPMNTaskType.Normal);
    _compile_task('userTask', BPMNTaskType.User);
    _compile_task('manualTask', BPMNTaskType.Manual);
    _compile_task('serviceTask', BPMNTaskType.Service);
    _compile_task('scriptTask', BPMNTaskType.Script);

    /**
     * Gateways
     */
    const _compile_gateway = (activity: string, type: BPMNGatewayType) => {
      if (activity in process) {
        if (Array.isArray(process[activity])) {
          for (const gateway of process[activity]) {
            this.activities.push(
              new BPMNGatewayActivity({
                ...gateway,
                type,
                category: BPMNActivityCategory.Gateway,
                lane: getLane(gateway._id, lanes),
              }),
            );
          }
        } else {
          this.activities.push(
            new BPMNGatewayActivity({
              ...process[activity],
              type,
              category: BPMNActivityCategory.Gateway,
              lane: getLane(process[activity]._id, lanes),
            }),
          );
        }
      }
    };

    _compile_gateway('exclusiveGateway', BPMNGatewayType.Exclusive);
    _compile_gateway('inclusiveGateway', BPMNGatewayType.Inclusive);
    _compile_gateway('parallelGateway', BPMNGatewayType.Parallel);
    _compile_gateway('complexGateway', BPMNGatewayType.Complex);

    /**
     * Events
     */
    if ('endEvent' in process) {
      if (Array.isArray(process.endEvent)) {
        for (const event of process.endEvent) {
          this.activities.push(
            new BPMNEventActivity({
              ...event,
              type: BPMNEventType.End,
              category: BPMNActivityCategory.Event,
              lane: getLane(event._id, lanes),
            }),
          );
        }
      } else {
        this.activities.push(
          new BPMNEventActivity({
            ...process.endEvent,
            type: BPMNEventType.End,
            category: BPMNActivityCategory.Event,
            lane: getLane(process.endEvent._id, lanes),
          }),
        );
      }
    } else {
      throw new BPMNException('Process should be at least one end event.');
    }

    const _compile_event = (activity: string, type: BPMNEventType) => {
      if (activity in process) {
        if (Array.isArray(process[activity])) {
          for (const event of process[activity]) {
            this.activities.push(
              new BPMNEventActivity({
                ...event,
                type,
                intermediateType: getIntermediateType(event),
                category: BPMNActivityCategory.Event,
                lane: getLane(event._id, lanes),
              }),
            );
          }
        } else {
          this.activities.push(
            new BPMNEventActivity({
              ...process[activity],
              type,
              intermediateType: getIntermediateType(process[activity]),
              category: BPMNActivityCategory.Event,
              lane: getLane(process[activity]._id, lanes),
            }),
          );
        }
      }
    };

    _compile_event('intermediateThrowEvent', BPMNEventType.IntermediateThrow);
    _compile_event('intermediateCatchEvent', BPMNEventType.IntermediateCatch);

    /**
     * Initialization
     */
    this.history.head[0].engine = this;
    this.history.head[0].flows = this.flows;
    this.history.head[0].activities = this.activities;
    for (const activity of this.activities) {
      activity.engine = this;
      activity.flows = this.flows;
      activity.activities = this.activities;
    }

    if (this.callable && this.activities.length && this.flows.length) this.start();
  }

  public serialize(): BPMNEngineSerialize {
    return {
      state: this.state,
      init_at: this._init_at,
      pause_at: this._pause_at,
      start_at: this._start_at,
      stop_at: this._stop_at,
      finish_at: this._finish_at,
      cancel_at: this._cancel_at,
      ...this.history.serialize(),
    };
  }

  public deserialize(data: BPMNEngineSerialize): void {
    this.state = data.state;
    this._init_at = data.init_at;
    this._pause_at = data.pause_at;
    this._start_at = data.start_at;
    this._stop_at = data.stop_at;
    this._finish_at = data.finish_at;
    this._cancel_at = data.cancel_at;
    this.history = new BPMNEngineHistory();
    this.history.deserialize(data.head, data.stack, this.activities);
  }

  public getRefHeadActivityById(activityId: string): BPMNActivity {
    const activity = getActivityById(activityId, this.history.head);
    if (activity) return activity;
    throw new BPMNException(`Head activity with id ${activityId} not found`);
  }

  public getRefHeadActivityByName(activityName: string): BPMNActivity {
    const activity = getActivityByName(activityName, this.history.head);
    if (activity) return activity;
    throw new BPMNException(`Head activity with name ${activityName} not found`);
  }

  private async _call(callback: CallableFunction, ...args): Promise<any> {
    if (callback.name === 'callback') return await callback(...args);
    return await this.callable[callback.name](...args);
  }

  public async run<T>(activityName: string, data?: T): Promise<T> {
    const activity = getActivityByName(activityName, this.history.head);
    if (!activity) throw new BPMNException(`run([Activity ${activityName}]) not found.`);

    if (this.isFinished()) throw new BPMNException('This workflow is already finished.');

    return await this.execute<T>(activity._id, this.callable[activityName], data);
  }

  public async execute<T>(activityId: string, callback: CallableFunction, data?: T): Promise<T> {
    if (this.isFinished()) return;
    if (!this.isStarted()) {
      if (this.isInitialized()) {
        throw new BPMNException(`Please initialize the engine with build() and bind() methods.`);
      }
      throw new BPMNException(
        `Current State is ${this.state}, Workflow only at started state can be execute functions.`,
      );
    }

    const activity = getActivityById(activityId, this.history.head);
    if (activity) {
      if (activity.isEntered()) {
        activity.start();
      } else {
        throw new BPMNException(
          `execute() Activity with name ${activity._name} and id ${activity._id} with ${activity.status} status can't be execute.\n
           you can change the activity state by getRefHeadActivityBy*() methods of engine.`,
        );
      }

      let result: T;
      switch (activity.category) {
        case BPMNActivityCategory.Event:
          result = await this._ExecuteEvent<T>(activity as BPMNEventActivity, callback, data);
          break;
        case BPMNActivityCategory.Gateway:
          result = await this._ExecuteGateway<T>(activity as BPMNGatewayActivity, callback, data);
          break;
        case BPMNActivityCategory.Task:
          result = await this._ExecuteTask<T>(activity as BPMNTaskActivity, callback, data);
          break;
      }

      if (!this.history.head.length) {
        this.finish();
      }

      await this.forward<T>(result);
      return result;
    }
  }

  private async _ExecuteEvent<T>(event: BPMNEventActivity, callback: CallableFunction, data?: T): Promise<T> {
    const statusBefore = event.status;
    const result = await this._call(callback, event, data);
    const statusAfter = event.status;

    if (statusBefore !== statusAfter) {
      switch (event.status) {
        case BPMNActivityStatus.Canceled:
          this.history.stack.push(new BPMNEventActivity(event));
          this.history.head = this.history.head.filter((value) => value._id !== event._id);
          break;
        case BPMNActivityStatus.Finished:
          this.history.stack.push(new BPMNEventActivity(event));
          this.history.head = this.history.head.filter((value) => value._id !== event._id);
          this.history.head = this.history.head.concat(...ignoreInHead(event.next() || [], this.history.head));
          break;
      }
    }

    return result;
  }

  private async _ExecuteGateway<T>(gateway: BPMNGatewayActivity, callback: CallableFunction, data?: T): Promise<T> {
    const statusBefore = gateway.status;
    const result = await this._call(callback, gateway, data);
    const statusAfter = gateway.status;

    if (statusBefore !== statusAfter) {
      switch (gateway.status) {
        case BPMNActivityStatus.Canceled:
          this.history.stack.push(new BPMNGatewayActivity(gateway));
          this.history.head = this.history.head.filter((value) => value._id !== gateway._id);
          break;
        case BPMNActivityStatus.Finished:
          this.history.stack.push(new BPMNGatewayActivity(gateway));
          this.history.head = this.history.head.filter((value) => value._id !== gateway._id);
          this.history.head = this.history.head.concat(...ignoreInHead(gateway.next() || [], this.history.head));
          break;
      }
    }

    return result;
  }

  private async _ExecuteTask<T>(task: BPMNTaskActivity, callback: CallableFunction, data?: T): Promise<T> {
    const statusBefore = task.status;
    const result = await this._call(callback, task, data);
    const statusAfter = task.status;

    if (statusBefore !== statusAfter) {
      switch (task.status) {
        case BPMNActivityStatus.Canceled:
          this.history.stack.push(new BPMNTaskActivity(task));
          this.history.head = this.history.head.filter((value) => value._id !== task._id);
          break;
        case BPMNActivityStatus.Finished:
          this.history.stack.push(new BPMNTaskActivity(task));
          this.history.head = this.history.head.filter((value) => value._id !== task._id);
          this.history.head = this.history.head.concat(...ignoreInHead(task.next() || [], this.history.head));
          break;
      }
    }

    return result;
  }

  private async forward<T>(data?: T): Promise<void> {
    for (const activity of this.history.head) {
      if (activity.isStopped() || activity.isPaused()) {
        continue;
      } else if (activity._name in this.callable) {
        if (!('_' + activity._name in this.callable)) {
          continue;
        }
      }

      let callback: CallableFunction;
      if ('_' + activity._name in this.callable) {
        callback = this.callable['_' + activity._name];
      } else {
        // tslint:disable-next-line: no-shadowed-variable
        callback = (activity: BPMNActivity) => {
          if (activity.isGateway()) {
            switch ((activity as BPMNGatewayActivity).type) {
              case BPMNGatewayType.Complex:
                throw new BPMNException(
                  `forward([Activity: ${activity._id}]) Complex gateways not fast forward activities.`,
                );
              case BPMNGatewayType.Exclusive:
                if (
                  (isOneOfIoTaken((activity as BPMNGatewayActivity).io_incoming) &&
                    isOnlyOneOfIoTaken((activity as BPMNGatewayActivity).io_outgoing)) ||
                  itHasOnlyOneIo((activity as BPMNGatewayActivity).io_outgoing)
                ) {
                  activity.finish();
                } else {
                  activity.pause();
                }
                break;
              case BPMNGatewayType.Inclusive:
                if (
                  (isAllOfIoTaken((activity as BPMNGatewayActivity).io_incoming) &&
                    isAnyOfIoTaken((activity as BPMNGatewayActivity).io_outgoing)) ||
                  itHasOnlyOneIo((activity as BPMNGatewayActivity).io_outgoing)
                ) {
                  activity.finish();
                } else {
                  activity.pause();
                }
                break;
              case BPMNGatewayType.Parallel:
                if (isAllOfIoTaken((activity as BPMNGatewayActivity).io_incoming)) {
                  activity.finish();
                } else {
                  activity.pause();
                }
                break;
            }
          } else if (activity.isTask()) {
            activity.finish();
          } else if (activity.isEvent()) {
            activity.finish();
          }
        };
      }

      await this.execute<T>(activity._id, callback, data);
    }
  }

  initialize(): BPMNEngine {
    this.state = BPMNEngineState.Init;
    this._init_at = new Date();
    return this;
  }

  pause(): BPMNEngine {
    this.state = BPMNEngineState.Paused;
    this._pause_at = new Date();
    return this;
  }

  start(): BPMNEngine {
    this.state = BPMNEngineState.Started;
    this._start_at = new Date();
    return this;
  }

  stop(): BPMNEngine {
    this.state = BPMNEngineState.Stopped;
    this._stop_at = new Date();
    return this;
  }

  finish(): BPMNEngine {
    this.state = BPMNEngineState.Finished;
    this._finish_at = new Date();
    return this;
  }

  cancel(): BPMNEngine {
    this.state = BPMNEngineState.Canceled;
    this._cancel_at = new Date();
    return this;
  }

  isInitialized(): boolean {
    return this.state === BPMNEngineState.Init;
  }

  isPaused(): boolean {
    return this.state === BPMNEngineState.Paused;
  }

  isStarted(): boolean {
    return this.state === BPMNEngineState.Started;
  }

  isStopped(): boolean {
    return this.state === BPMNEngineState.Stopped;
  }

  isFinished(): boolean {
    return this.state === BPMNEngineState.Finished;
  }

  isCanceled(): boolean {
    return this.state === BPMNEngineState.Canceled;
  }

  public get initialized_at(): Date {
    return this._init_at;
  }

  public get paused_at(): Date {
    return this._pause_at;
  }

  public get started_at(): Date {
    return this._start_at;
  }

  public get stopped_at(): Date {
    return this._stop_at;
  }

  public get finished_at(): Date {
    return this._finish_at;
  }

  public get canceled_at(): Date {
    return this._cancel_at;
  }
}
