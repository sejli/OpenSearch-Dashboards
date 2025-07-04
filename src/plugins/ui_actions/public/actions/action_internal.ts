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

// @ts-ignore
import React from 'react';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { Action, ActionContext as Context, ActionDefinition } from './action';
import { Presentable, PresentableGrouping } from '../util/presentable';
import { uiToReactComponent } from '../../../opensearch_dashboards_react/public';
import { ActionType } from '../types';

/**
 * @internal
 */
export class ActionInternal<A extends ActionDefinition = ActionDefinition>
  implements Action<Context<A>>, Presentable<Context<A>> {
  constructor(public readonly definition: A) {}

  // @ts-expect-error TS2729 TODO(ts-error): fixme
  public readonly id: string = this.definition.id;
  // @ts-expect-error TS2729 TODO(ts-error): fixme
  public readonly type: ActionType = this.definition.type || '';
  // @ts-expect-error TS2729 TODO(ts-error): fixme
  public readonly order: number = this.definition.order || 0;
  // @ts-expect-error TS2729 TODO(ts-error): fixme
  public readonly MenuItem? = this.definition.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;
  // @ts-expect-error TS2729 TODO(ts-error): fixme
  public readonly grouping?: PresentableGrouping<Context<A>> = this.definition.grouping;

  public execute(context: Context<A>) {
    return this.definition.execute(context);
  }

  public getIconType(context: Context<A>): EuiIconType | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  // @ts-expect-error TS2416 TODO(ts-error): fixme
  public getDisplayName(context: Context<A>): JSX.Element | string {
    if (!this.definition.getDisplayName) return `Action: ${this.id}`;
    return this.definition.getDisplayName(context);
  }

  public getDisplayNameTooltip(context: Context<A>): string {
    if (!this.definition.getDisplayNameTooltip) return '';
    return this.definition.getDisplayNameTooltip(context);
  }

  public async isCompatible(context: Context<A>): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    return await this.definition.isCompatible(context);
  }

  public isDisabled(context: Context<A>): boolean {
    if (!this.definition.isDisabled) return false;
    // @ts-expect-error TS2345 TODO(ts-error): fixme
    return this.definition.isDisabled(context);
  }

  public getTooltip(context: Context<A>): string {
    if (!this.definition.getTooltip) return '';
    // @ts-expect-error TS2345 TODO(ts-error): fixme
    return this.definition.getTooltip(context);
  }

  public async getHref(context: Context<A>): Promise<string | undefined> {
    if (!this.definition.getHref) return undefined;
    return await this.definition.getHref(context);
  }

  public async shouldAutoExecute(context: Context<A>): Promise<boolean> {
    if (!this.definition.shouldAutoExecute) return false;
    return this.definition.shouldAutoExecute(context);
  }
}
