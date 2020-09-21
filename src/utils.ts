import { BPMNGatewayActivity, BPMNEventActivity, BPMNTaskActivity, BPMNBoundaryEvent } from './activities';
import { BPMNActivityCategory, BPMNEventIntermediateType } from './enums';
import { BPMNFlowArtifact, BPMNLaneArtifact } from './artifacts';
import { BPMNGeneralActivity } from './activity';
import { BPMNActivityDocType } from './bpmn';

export const getActivityById = (
  activityId: string,
  activities: BPMNGeneralActivity[],
): BPMNGeneralActivity | undefined => {
  for (const activity of activities) {
    if (activity._id === activityId) return activity;
  }
};

export const getActivityByName = (activityName: string, activities: BPMNGeneralActivity[]): BPMNGeneralActivity => {
  for (const activity of activities) {
    if (activity._name && activity._name === activityName) return activity;
  }
};

export const getTargetRefs = (outgoing: string | string[], flows: BPMNFlowArtifact[]): string[] => {
  const targetRefs: string[] = [];
  const searchTargetRefs = (out: string) => {
    for (const flow of flows) {
      if (flow._id === out) {
        targetRefs.push(flow._targetRef);
        break;
      }
    }
  };
  if (Array.isArray(outgoing)) {
    for (const outcome of outgoing) {
      searchTargetRefs(outcome);
    }
  } else {
    searchTargetRefs(outgoing);
  }
  return targetRefs;
};

export const getIntermediateType = (intermediate: BPMNActivityDocType): BPMNEventIntermediateType => {
  if ('errorEventDefinition' in intermediate) return BPMNEventIntermediateType.Error;
  if ('timerEventDefinition' in intermediate) return BPMNEventIntermediateType.Timer;
  if ('signalEventDefinition' in intermediate) return BPMNEventIntermediateType.Signal;
  if ('messageEventDefinition' in intermediate) return BPMNEventIntermediateType.Message;
  return BPMNEventIntermediateType.Normal;
};

export const findLastActivityFromStackById = (
  activityId: string,
  stack: BPMNGeneralActivity[],
): BPMNGeneralActivity => {
  let lastActivity: BPMNGatewayActivity | BPMNEventActivity | BPMNTaskActivity;
  for (const activity of stack) {
    if (activity._id === activityId) {
      switch (activity.category) {
        case BPMNActivityCategory.Event:
          lastActivity = activity as BPMNEventActivity;
          break;
        case BPMNActivityCategory.Gateway:
          lastActivity = activity as BPMNGatewayActivity;
          break;
        case BPMNActivityCategory.Task:
          lastActivity = activity as BPMNTaskActivity;
          break;
      }
    }
  }
  return lastActivity;
};

export const getNextActivities = (targetRefs: string[], activities: BPMNGeneralActivity[]): BPMNGeneralActivity[] => {
  const nextActivities = [];
  for (const targetRef of targetRefs) {
    for (const activity of activities) {
      if (targetRef === activity._id) {
        let nextActivity: BPMNGeneralActivity;
        switch (activity.category) {
          case BPMNActivityCategory.Event:
            nextActivity = new BPMNEventActivity(activity as BPMNEventActivity).enter();
            break;
          case BPMNActivityCategory.Gateway:
            nextActivity = new BPMNGatewayActivity(activity as BPMNGatewayActivity).enter();
            break;
          case BPMNActivityCategory.Task:
            nextActivity = new BPMNTaskActivity(activity as BPMNTaskActivity).enter();
            break;
        }
        nextActivities.push(nextActivity);
        break;
      }
    }
  }
  return nextActivities;
};

export const ignoreInHead = (
  nextActivities: BPMNGeneralActivity[],
  head: BPMNGeneralActivity[],
): BPMNGeneralActivity[] => {
  const result = [];
  for (const nextActivity of nextActivities) {
    let flag = true;
    for (const headActivity of head) {
      if (nextActivity._id === headActivity._id) {
        flag = false;
        break;
      }
    }
    if (flag) {
      result.push(nextActivity);
    }
  }
  return result;
};

export const combineWithHeadActivities = (
  nextActivities: BPMNGeneralActivity[],
  head: BPMNGeneralActivity[],
): BPMNGeneralActivity[] => {
  const result = [];
  for (const nextActivity of nextActivities) {
    let flag = true;
    for (const headActivity of head) {
      if (nextActivity._id === headActivity._id) {
        result.push(headActivity);
        flag = false;
        break;
      }
    }
    if (flag) {
      result.push(nextActivity);
    }
  }
  return result;
};

export const getBoundaryEvent = (id: string, boundaryEvents: BPMNBoundaryEvent[]): BPMNBoundaryEvent | void => {
  for (const boundaryEvent of boundaryEvents) {
    if (boundaryEvent._attachedToRef === id) return boundaryEvent;
  }
};

export const getLane = (id: string, lanes: BPMNLaneArtifact[]): BPMNLaneArtifact | undefined => {
  for (const lane of lanes) {
    if (lane.flowNodeRef?.includes(id)) {
      const newLane = new BPMNLaneArtifact(lane);
      delete newLane.flowNodeRef;
      return newLane;
    }
  }
};
