/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { UiActionsService } from './ui_actions_service';
import { Action, ActionInternal, createAction } from '../actions';
import { createHelloWorldAction } from '../tests/test_samples';
import { TriggerRegistry, TriggerId, ActionType, ActionRegistry } from '../types';
import { Trigger } from '../triggers';

// Casting to ActionType or TriggerId is a hack - in a real situation use
// declare module and add this id to the appropriate context mapping.
const FOO_TRIGGER: TriggerId = 'FOO_TRIGGER' as TriggerId;
const BAR_TRIGGER: TriggerId = 'BAR_TRIGGER' as TriggerId;
const MY_TRIGGER: TriggerId = 'MY_TRIGGER' as TriggerId;

const testAction1: Action = {
  id: 'action1',
  order: 1,
  type: 'type1' as ActionType,
  execute: async () => {},
  getDisplayName: () => 'test1',
  getIconType: () => undefined,
  isCompatible: async () => true,
};

const testAction2: Action = {
  id: 'action2',
  order: 2,
  type: 'type2' as ActionType,
  execute: async () => {},
  getDisplayName: () => 'test2',
  getIconType: () => undefined,
  isCompatible: async () => true,
};

describe('UiActionsService', () => {
  test('can instantiate', () => {
    new UiActionsService();
  });

  describe('.registerTrigger()', () => {
    test('can register a trigger', () => {
      const service = new UiActionsService();
      service.registerTrigger({
        id: BAR_TRIGGER,
      });
    });
  });

  describe('.getTrigger()', () => {
    test('can get Trigger from registry', () => {
      const service = new UiActionsService();
      service.registerTrigger({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });

      const trigger = service.getTrigger(BAR_TRIGGER);

      expect(trigger).toMatchObject({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });
    });

    test('throws if trigger does not exist', () => {
      const service = new UiActionsService();

      expect(() => service.getTrigger(FOO_TRIGGER)).toThrowError(
        'Trigger [triggerId = FOO_TRIGGER] does not exist.'
      );
    });
  });

  describe('.registerAction()', () => {
    test('can register an action', () => {
      const service = new UiActionsService();
      service.registerAction({
        id: 'test',
        execute: async () => {},
        getDisplayName: () => 'test',
        getIconType: () => undefined,
        isCompatible: async () => true,
        type: 'test' as ActionType,
      });
    });

    test('return action instance', () => {
      const service = new UiActionsService();
      const action = service.registerAction({
        id: 'test',
        execute: async () => {},
        getDisplayName: () => 'test',
        getIconType: () => undefined,
        isCompatible: async () => true,
        type: 'test' as ActionType,
      });

      expect(action).toBeInstanceOf(ActionInternal);
      expect(action.id).toBe('test');
    });
  });

  describe('.getTriggerActions()', () => {
    const action1: Action = {
      id: 'action1',
      order: 1,
      type: 'type1' as ActionType,
      execute: async () => {},
      getDisplayName: () => 'test',
      getIconType: () => undefined,
      isCompatible: async () => true,
    };
    const action2: Action = {
      id: 'action2',
      order: 2,
      type: 'type2' as ActionType,
      execute: async () => {},
      getDisplayName: () => 'test',
      getIconType: () => undefined,
      isCompatible: async () => true,
    };

    test('returns actions set on trigger', () => {
      const service = new UiActionsService();

      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service.registerAction(action1);
      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service.registerAction(action2);
      service.registerTrigger({
        description: 'foo',
        id: FOO_TRIGGER,
        title: 'baz',
      });

      const list0 = service.getTriggerActions(FOO_TRIGGER);

      expect(list0).toHaveLength(0);

      service.addTriggerAction(FOO_TRIGGER, action1);
      const list1 = service.getTriggerActions(FOO_TRIGGER);

      expect(list1).toHaveLength(1);
      expect(list1[0]).toBeInstanceOf(ActionInternal);
      expect(list1[0].id).toBe(action1.id);

      service.addTriggerAction(FOO_TRIGGER, action2);
      const list2 = service.getTriggerActions(FOO_TRIGGER);

      expect(list2).toHaveLength(2);
      expect(!!list2.find(({ id }: any) => id === 'action1')).toBe(true);
      expect(!!list2.find(({ id }: any) => id === 'action2')).toBe(true);
    });
  });

  describe('.getTriggerCompatibleActions()', () => {
    test('can register and get actions', async () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });
      const helloWorldAction = createHelloWorldAction({} as any);
      const length = actions.size;

      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service.registerAction(helloWorldAction);

      expect(actions.size - length).toBe(1);
      expect(actions.get(helloWorldAction.id)!.id).toBe(helloWorldAction.id);
    });

    test('getTriggerCompatibleActions returns attached actions', async () => {
      const service = new UiActionsService();
      const helloWorldAction = createHelloWorldAction({} as any);

      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service.registerAction(helloWorldAction);

      const testTrigger: Trigger = {
        id: MY_TRIGGER,
        title: 'My trigger',
      };
      service.registerTrigger(testTrigger);
      service.addTriggerAction(MY_TRIGGER, helloWorldAction);

      const compatibleActions = await service.getTriggerCompatibleActions(MY_TRIGGER, {
        hi: 'there',
      });

      expect(compatibleActions.length).toBe(1);
      expect(compatibleActions[0].id).toBe(helloWorldAction.id);
    });

    test('filters out actions not applicable based on the context', async () => {
      const service = new UiActionsService();
      const action = createAction({
        type: 'test' as ActionType,
        isCompatible: ({ accept }: { accept: boolean }) => Promise.resolve(accept),
        execute: () => Promise.resolve(),
      });

      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service.registerAction(action);

      const testTrigger: Trigger = {
        id: MY_TRIGGER,
        title: 'My trigger',
      };

      service.registerTrigger(testTrigger);
      service.addTriggerAction(testTrigger.id, action);

      const compatibleActions1 = await service.getTriggerCompatibleActions(testTrigger.id, {
        accept: true,
      });

      expect(compatibleActions1.length).toBe(1);

      const compatibleActions2 = await service.getTriggerCompatibleActions(testTrigger.id, {
        accept: false,
      });

      expect(compatibleActions2.length).toBe(0);
    });

    test(`throws an error with an invalid trigger ID`, async () => {
      const service = new UiActionsService();

      // Without the cast "as TriggerId" typescript will happily throw an error!
      await expect(
        service.getTriggerCompatibleActions('I do not exist' as TriggerId, {})
      ).rejects.toMatchObject(new Error('Trigger [triggerId = I do not exist] does not exist.'));
    });

    test('returns empty list if trigger not attached to any action', async () => {
      const service = new UiActionsService();
      const testTrigger: Trigger = {
        id: '123' as TriggerId,
        title: '123',
      };
      service.registerTrigger(testTrigger);

      const actions = await service.getTriggerCompatibleActions(testTrigger.id, {});

      expect(actions).toEqual([]);
    });
  });

  describe('.fork()', () => {
    test('returns a new instance of the service', () => {
      const service1 = new UiActionsService();
      const service2 = service1.fork();

      expect(service1).not.toBe(service2);
      expect(service2).toBeInstanceOf(UiActionsService);
    });

    test('triggers registered in original service are available in original an forked services', () => {
      const service1 = new UiActionsService();
      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      const service2 = service1.fork();

      const trigger1 = service1.getTrigger(FOO_TRIGGER);
      const trigger2 = service2.getTrigger(FOO_TRIGGER);

      expect(trigger1.id).toBe(FOO_TRIGGER);
      expect(trigger2.id).toBe(FOO_TRIGGER);
    });

    test('triggers registered in forked service are not available in original service', () => {
      const service1 = new UiActionsService();
      const service2 = service1.fork();

      service2.registerTrigger({
        id: FOO_TRIGGER,
      });

      expect(() => service1.getTrigger(FOO_TRIGGER)).toThrowErrorMatchingInlineSnapshot(
        `"Trigger [triggerId = FOO_TRIGGER] does not exist."`
      );

      const trigger2 = service2.getTrigger(FOO_TRIGGER);
      expect(trigger2.id).toBe(FOO_TRIGGER);
    });

    test('forked service preserves trigger-to-actions mapping', () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service1.registerAction(testAction1);
      service1.addTriggerAction(FOO_TRIGGER, testAction1);

      const service2 = service1.fork();

      const actions1 = service1.getTriggerActions(FOO_TRIGGER);
      const actions2 = service2.getTriggerActions(FOO_TRIGGER);

      expect(actions1).toHaveLength(1);
      expect(actions2).toHaveLength(1);
      expect(actions1[0].id).toBe(testAction1.id);
      expect(actions2[0].id).toBe(testAction1.id);
    });

    test('new attachments in fork do not appear in original service', () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service1.registerAction(testAction1);
      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service1.registerAction(testAction2);
      service1.addTriggerAction(FOO_TRIGGER, testAction1);

      const service2 = service1.fork();

      expect(service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      expect(service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);

      service2.addTriggerAction(FOO_TRIGGER, testAction2);

      expect(service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      expect(service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(2);
    });

    test('new attachments in original service do not appear in fork', () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service1.registerAction(testAction1);
      // @ts-expect-error TS2345 TODO(ts-error): fixme
      service1.registerAction(testAction2);
      service1.addTriggerAction(FOO_TRIGGER, testAction1);

      const service2 = service1.fork();

      expect(service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      expect(service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);

      service1.addTriggerAction(FOO_TRIGGER, testAction2);

      expect(service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(2);
      expect(service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
    });
  });

  describe('registries', () => {
    const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

    test('can register trigger', () => {
      const triggers: TriggerRegistry = new Map();
      const service = new UiActionsService({ triggers });

      service.registerTrigger({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });
      const triggerContract = service.getTrigger(BAR_TRIGGER);

      expect(triggerContract).toMatchObject({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });
    });

    test('can register action', () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });

      service.registerAction({
        id: ACTION_HELLO_WORLD,
        order: 13,
      } as any);

      expect(actions.get(ACTION_HELLO_WORLD)).toMatchObject({
        id: ACTION_HELLO_WORLD,
        order: 13,
      });
    });

    test('can attach an action to a trigger', () => {
      const service = new UiActionsService();

      const trigger: Trigger = {
        id: MY_TRIGGER,
      };
      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as any;

      service.registerTrigger(trigger);
      service.addTriggerAction(MY_TRIGGER, action);

      const actions = service.getTriggerActions(trigger.id);

      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe(ACTION_HELLO_WORLD);
    });

    test('can detach an action from a trigger', () => {
      const service = new UiActionsService();

      const trigger: Trigger = {
        id: MY_TRIGGER,
      };
      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as any;

      service.registerTrigger(trigger);
      service.registerAction(action);
      service.addTriggerAction(trigger.id, action);
      service.detachAction(trigger.id, action.id);

      const actions2 = service.getTriggerActions(trigger.id);
      expect(actions2).toEqual([]);
    });

    test('detaching an invalid action from a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as any;

      service.registerAction(action);
      expect(() =>
        service.detachAction('i do not exist' as TriggerId, ACTION_HELLO_WORLD)
      ).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for detaching action [actionId = ACTION_HELLO_WORLD].'
      );
    });

    test('attaching an invalid action to a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as any;

      service.registerAction(action);
      expect(() => service.addTriggerAction('i do not exist' as TriggerId, action)).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for attaching action [actionId = ACTION_HELLO_WORLD].'
      );
    });

    test('cannot register another action with the same ID', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as any;

      service.registerAction(action);
      expect(() => service.registerAction(action)).toThrowError(
        'Action [action.id = ACTION_HELLO_WORLD] already registered.'
      );
    });

    test('cannot register another trigger with the same ID', async () => {
      const service = new UiActionsService();

      const trigger = { id: 'MY-TRIGGER' } as any;

      service.registerTrigger(trigger);
      expect(() => service.registerTrigger(trigger)).toThrowError(
        'Trigger [trigger.id = MY-TRIGGER] already registered.'
      );
    });
  });
});
