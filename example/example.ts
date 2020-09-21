import { BPMNEventActivity, BPMNGatewayActivity } from 'activities';
import * as diagram from './diagram.process.json';
import { BPMNInterface, BPMNEngine } from 'index';

class DataObject {
  value: string;

  constructor() {
    this.value = '';
  }
}

// tslint:disable-next-line: max-classes-per-file
class CallableClass implements BPMNInterface {
  StartEvent(activity: BPMNEventActivity, data?: DataObject): DataObject {
    data.value += 'StartEvent -> ';
    activity.finish();
    return data;
  }

  _Xor1(activity: BPMNGatewayActivity, data?: DataObject): DataObject {
    data.value += '_Xor1 to Task2 -> ';
    activity.finish().takeOutgoingByName('Task2');
    return data;
  }

  _Xor2(activity: BPMNGatewayActivity, data?: DataObject): DataObject {
    data.value += '_Xor2 -> ';
    activity.finish();
    return data;
  }

  _Xor3(activity: BPMNGatewayActivity, data?: DataObject): DataObject {
    data.value += '_Xor3 -> ';
    activity.finish();
    return data;
  }

  _Xor4(activity: BPMNGatewayActivity, data?: DataObject): DataObject {
    data.value += '_Xor4 to Parallel2 -> ';
    activity.finish().takeOutgoingByName('Parallel2');
    return data;
  }
}

const engine = new BPMNEngine({ callable: new CallableClass(), process: diagram });
engine
  .run<DataObject>('StartEvent', new DataObject())
  .then((data) => {
    // tslint:disable-next-line: no-console
    console.debug(data);
  })
  // tslint:disable-next-line: no-console
  .catch((err) => console.error(err));

const serializedEngine = engine.serialize();
// Save `serializedEngine` json model to your db
