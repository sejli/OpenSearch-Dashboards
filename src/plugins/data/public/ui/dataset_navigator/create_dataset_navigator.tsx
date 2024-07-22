/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HttpStart, NotificationsStart, SavedObjectsClientContract } from 'opensearch-dashboards/public';
import { IndexPatternsContract } from 'src/plugins/data/public';
import { DataSetNavigator, DataSetNavigatorProps } from './';
import { Settings } from '../settings';

// Updated function signature to include additional dependencies
export function createDataSetNavigator(
  settings: Settings,
  savedObjectsClient: SavedObjectsClientContract,
  indexPatternsService: IndexPatternsContract,
  search: any,
  onDataSetSelected: any,
  http: HttpStart,
  notifications: NotificationsStart,
) {
  // Return a function that takes props, omitting the dependencies from the props type
  return (
    props: Omit<DataSetNavigatorProps, 'savedObjectsClient' | 'indexPatternsService' | 'search'>
  ) => (
    <DataSetNavigator
      {...props}
      settings={settings}
      savedObjectsClient={savedObjectsClient}
      indexPatternsService={indexPatternsService}
      search={search}
      onDataSetSelected={onDataSetSelected}
      http={http}
      notifications={notifications}
    />
  );
}
