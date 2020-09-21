import { BPMNEventActivity, BPMNGatewayActivity, BPMNTaskActivity } from './activities';
import { BPMNGeneralActivity } from './activity';
import { BPMNActivityCategory } from './enums';

export class BPMNEngineHistory {
  public head: BPMNGeneralActivity[] = [];
  public stack: BPMNGeneralActivity[] = [];

  private activityBinding(target: BPMNGeneralActivity, reference: BPMNGeneralActivity): void {
    target.flows = reference.flows;
    target.activities = reference.activities;
    target.engine = reference.engine;
  }

  public serialize(): { head: BPMNGeneralActivity[]; stack: BPMNGeneralActivity[] } {
    const result: { head: BPMNGeneralActivity[]; stack: BPMNGeneralActivity[] } = { head: [], stack: [] };
    for (const activity of this.head) {
      result.head.push(activity.serialize());
    }
    for (const activity of this.stack) {
      result.stack.push(activity.serialize());
    }
    return result;
  }

  private historyBinding(
    target: 'stack' | 'head',
    dataset: BPMNGeneralActivity[],
    activities: BPMNGeneralActivity[],
  ): void {
    for (const data of dataset) {
      for (const activity of activities) {
        if (data._id === activity._id || data._name === 'StartEvent') {
          let temp: BPMNGeneralActivity;
          switch (data.category) {
            case BPMNActivityCategory.Event:
              temp = new BPMNEventActivity(data as BPMNEventActivity);
              this.activityBinding(temp, activity);
              this[target].push(temp);
              break;
            case BPMNActivityCategory.Gateway:
              temp = new BPMNGatewayActivity(data as BPMNGatewayActivity);
              this.activityBinding(temp, activity);
              this[target].push(temp);
              break;
            case BPMNActivityCategory.Task:
              temp = new BPMNTaskActivity(data as BPMNTaskActivity);
              this.activityBinding(temp, activity);
              this[target].push(temp);
              break;
          }
          break;
        }
      }
    }
  }

  public deserialize(
    head: BPMNGeneralActivity[],
    stack: BPMNGeneralActivity[],
    activities: BPMNGeneralActivity[],
  ): void {
    this.historyBinding('head', head, activities);
    this.historyBinding('stack', stack, activities);
  }
}
