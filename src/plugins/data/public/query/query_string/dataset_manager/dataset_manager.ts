/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject } from 'rxjs';
import { CoreStart } from 'opensearch-dashboards/public';
import { skip } from 'rxjs/operators';
import {
  Dataset,
  DataSource,
  IndexPattern,
  UI_SETTINGS,
  DEFAULT_DATA,
  DataStructure,
  CachedDataStructure,
  DataStructureCache,
  toCachedDataStructure,
  createDataStructureCache,
} from '../../../../common';
import { IndexPatternsContract } from '../../../index_patterns';

type DatasetTypeHandler = (dataset: Dataset) => DataStructure;

export class DatasetManager {
  private dataset$: BehaviorSubject<Dataset | undefined>;
  private indexPatterns?: IndexPatternsContract;
  private defaultDataset?: Dataset;
  private dataStructureCache: DataStructureCache;
  private datasetTypeRegistry: Map<string, DatasetTypeHandler>;

  constructor(private readonly uiSettings: CoreStart['uiSettings']) {
    this.dataset$ = new BehaviorSubject<Dataset | undefined>(undefined);
    this.dataStructureCache = createDataStructureCache();
    this.datasetTypeRegistry = new Map();

    // Register default handlers
    this.registerDatasetType(
      DEFAULT_DATA.SET_TYPES.INDEX_PATTERN,
      this.indexPatternToDataStructure
    );
  }

  public init = async (indexPatterns: IndexPatternsContract) => {
    if (!this.uiSettings.get(UI_SETTINGS.QUERY_ENHANCEMENTS_ENABLED)) return;
    this.indexPatterns = indexPatterns;
    this.defaultDataset = await this.fetchDefaultDataset();
  };

  public initWithIndexPattern = (indexPattern: IndexPattern | null) => {
    if (!this.uiSettings.get(UI_SETTINGS.QUERY_ENHANCEMENTS_ENABLED)) return;
    if (!indexPattern || !indexPattern.id) {
      return undefined;
    }

    this.defaultDataset = this.createDatasetFromIndexPattern(indexPattern);
  };

  public getUpdates$ = () => {
    return this.dataset$.asObservable().pipe(skip(1));
  };

  public getDataset = () => {
    return this.dataset$.getValue();
  };

  public setDataset = (dataset: Dataset | undefined) => {
    if (!this.uiSettings.get(UI_SETTINGS.QUERY_ENHANCEMENTS_ENABLED)) return;
    this.dataset$.next(dataset);

    if (dataset) {
      this.cacheDatasetStructure(dataset);
    }
  };

  public getDefaultDataset = () => {
    return this.defaultDataset;
  };

  public fetchDefaultDataset = async (): Promise<Dataset | undefined> => {
    const defaultIndexPatternId = this.uiSettings.get('defaultIndex');
    if (!defaultIndexPatternId) {
      return undefined;
    }

    const indexPattern = await this.indexPatterns?.get(defaultIndexPatternId);
    if (!indexPattern || !indexPattern.id) {
      return undefined;
    }

    return this.createDatasetFromIndexPattern(indexPattern);
  };

  private createDatasetFromIndexPattern(indexPattern: IndexPattern): Dataset {
    return {
      id: indexPattern.id!,
      title: indexPattern.title,
      type: DEFAULT_DATA.SET_TYPES.INDEX_PATTERN,
      timeFieldName: indexPattern.timeFieldName,
      dataSource: indexPattern.dataSourceRef
        ? {
            id: indexPattern.dataSourceRef.id,
            title: indexPattern.dataSourceRef.name!,
            type: indexPattern.dataSourceRef.type,
          }
        : undefined,
    };
  }

  private indexPatternToDataStructure(dataset: Dataset): DataStructure {
    return {
      id: dataset.id,
      title: dataset.title,
      type: DATA_STRUCTURE_TYPES.INDEX,
      parent: dataset.dataSource
        ? {
            id: dataset.dataSource.id,
            title: dataset.dataSource.title,
            type: DATA_STRUCTURE_TYPES.DATA_SOURCE,
          }
        : undefined,
    };
  }

  public registerDatasetType(type: string, handler: DatasetTypeHandler) {
    this.datasetTypeRegistry.set(type, handler);
  }

  private cacheDatasetStructure(dataset: Dataset) {
    const handler = this.datasetTypeRegistry.get(dataset.type);
    if (!handler) {
      console.warn(`No handler registered for dataset type: ${dataset.type}`);
      return;
    }

    const dataStructure = handler(dataset);
    this.cacheDataStructureRecursively(dataStructure);
  }

  private cacheDataStructureRecursively(dataStructure: DataStructure) {
    const cachedStructure = toCachedDataStructure(dataStructure);
    this.dataStructureCache.set(cachedStructure.id, cachedStructure);

    if (dataStructure.parent) {
      this.cacheDataStructureRecursively(dataStructure.parent);
    }

    if (dataStructure.children) {
      dataStructure.children.forEach((child) => this.cacheDataStructureRecursively(child));
    }
  }

  public getCachedDataStructure(id: string): CachedDataStructure | undefined {
    return this.dataStructureCache.get(id);
  }

  public clearDataStructureCache(id?: string) {
    if (id) {
      this.dataStructureCache.clear(id);
    } else {
      this.dataStructureCache.clearAll();
    }
  }
}

export type DatasetContract = PublicMethodsOf<DatasetManager>;
