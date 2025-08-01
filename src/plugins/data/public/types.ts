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

import { CoreStart } from 'src/core/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';
import { AutocompleteSetup, AutocompleteStart } from './autocomplete';
import { FieldFormatsSetup, FieldFormatsStart } from './field_formats';
import { createFiltersFromRangeSelectAction, createFiltersFromValueClickAction } from './actions';
import { ISearchSetup, ISearchStart, SearchEnhancements } from './search';
import { EditorEnhancements, QuerySetup, QueryStart } from './query';
import { DataViewsContract } from './data_views';
import { IndexPatternsContract } from './index_patterns';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { DataSourceStart } from './data_sources/datasource_services/types';
import { IUiStart } from './ui';
import { DataStorage } from '../common';

export interface DataPublicPluginEnhancements {
  search?: SearchEnhancements;
  editor?: EditorEnhancements;
}

export interface DataSetupDependencies {
  expressions: ExpressionsSetup;
  uiActions: UiActionsSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface DataStartDependencies {
  uiActions: UiActionsStart;
}

/**
 * Data plugin public Setup contract
 */
export interface DataPublicPluginSetup {
  autocomplete: AutocompleteSetup;
  search: ISearchSetup;
  fieldFormats: FieldFormatsSetup;
  query: QuerySetup;
  /**
   * @experimental
   */
  __enhance: (enhancements: DataPublicPluginEnhancements) => void;
}

/**
 * utilities to generate filters from action context
 */
export interface DataPublicPluginStartActions {
  createFiltersFromValueClickAction: typeof createFiltersFromValueClickAction;
  createFiltersFromRangeSelectAction: typeof createFiltersFromRangeSelectAction;
}

/**
 * Data plugin public Start contract
 */
export interface DataPublicPluginStart {
  /**
   * filter creation utilities
   * {@link DataPublicPluginStartActions}
   */
  actions: DataPublicPluginStartActions;
  /**
   * autocomplete service
   * {@link AutocompleteStart}
   */
  autocomplete: AutocompleteStart;
  /**
   * @deprecated
   * index patterns service
   * {@link IndexPatternsContract}
   */
  indexPatterns: IndexPatternsContract;
  /**
   * data views service
   * {@link DataViewwsContract}
   */
  dataViews: DataViewsContract;
  /**
   * search service
   * {@link ISearchStart}
   */
  search: ISearchStart;
  /**
   * field formats service
   * {@link FieldFormatsStart}
   */
  fieldFormats: FieldFormatsStart;
  /**
   * query service
   * {@link QueryStart}
   */
  query: QueryStart;
  /**
   * UI components service
   * {@link IUiStart}
   */
  ui: IUiStart;
  /**
   * multiple datasources
   * {@link DataSourceStart}
   */
  dataSources: DataSourceStart;
}

export interface IDataPluginServices extends Partial<CoreStart> {
  appName: string;
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  storage: DataStorage;
  data: DataPublicPluginStart;
}
