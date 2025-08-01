/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDefaultQuery, setDatePickerDatesAndSearchIfRelevant } from './shared';
import { verifyDiscoverPageState } from './saved';
import { DatasetTypes, QueryLanguages } from './constants';

/**
 * Returns the expected hit count, if relevant, for the provided datasetType + language
 * @param {QueryEnhancementDataset} datasetType - the type of the dataset
 * @param {QueryEnhancementLanguage} language - the query language name
 * @returns {number|undefined}
 */

const query = 'source = data_logs_small_time_*';
const language = 'PPL';

const getExpectedHitCount = (datasetType, language) => {
  switch (datasetType) {
    case DatasetTypes.INDEX_PATTERN.name:
      switch (language) {
        case QueryLanguages.PPL.name:
          // TODO: Update this to 101 once Histogram is supported on 2.17
          return undefined;
        default:
          throw new Error(
            `getExpectedHitCount encountered unsupported language for ${datasetType}: ${language}`
          );
      }
    case DatasetTypes.INDEXES.name:
      switch (language) {
        case QueryLanguages.PPL.name:
          // TODO: Update this to 10,904 once Histogram is supported on 2.17
          return undefined;
        default:
          throw new Error(
            `getExpectedHitCount encountered unsupported language for ${datasetType}: ${language}`
          );
      }
    default:
      throw new Error(`getExpectedHitCount encountered unsupported datasetType: ${datasetType}`);
  }
};

export const generateDatasetSelectorTestConfiguration = (dataset, datasetType, language) => {
  const baseConfig = {
    dataset,
    datasetType,
    language: language.name,
    testName: `${language.name}-${datasetType}`,
  };

  return {
    ...baseConfig,
    queryString: getDefaultQuery(dataset, language.name),
    hitCount: getExpectedHitCount(datasetType, language.name),
  };
};

export const verifyBaseState = (dataset) => {
  verifyDiscoverPageState({
    dataset: dataset,
    queryString: query,
    language: language,
    hitCount: '20,000',
  });
};

export const setUpBaseState = (dataset, dataSourceName) => {
  // Setting up the dataset
  cy.explore.setDataset(dataset, dataSourceName, 'INDEX_PATTERN');

  // Setting the TimeRange
  setDatePickerDatesAndSearchIfRelevant(language);

  // Setting up Query
  cy.explore.setQueryEditor(query);
};
