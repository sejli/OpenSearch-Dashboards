/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { SavedObjectsClientContract } from 'opensearch-dashboards/public';
import _ from 'lodash';
import { i18n } from '@osd/i18n';
import { IIndexPattern } from '../..';
import { fetchClusters } from './fetch_clusters';
import { fetchIndices } from './fetch_indices';
import { getSearchService, getUiService } from '../../services';

export interface DataSetOption {
  id: string;
  name: string;
  dataSourceRef?: string;
}

export interface DataSetNavigatorProps {
  indexPatterns?: Array<IIndexPattern | string>;
  dataSet?: DataSetOption;
  savedObjectsClient: SavedObjectsClientContract;
  onSelectDataSet: (newDataSet: DataSetOption) => void;
}

export const DataSetNavigator = (props: DataSetNavigatorProps) => {
  const indexPatternsLabel = i18n.translate('data.query.dataSetNavigator.indexPatternsName', {
    defaultMessage: 'Index Patterns',
  });
  const clustersLabel = i18n.translate('data.query.dataSetNavigator.clustersName', {
    defaultMessage: 'Clusters',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [clusterList, setClusterList] = useState<any>([]);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [indexList, setIndexList] = useState<any>([]);
  const [selectedDataSet, setSelectedDataSet] = useState<string>(
    typeof props.indexPatterns?.[0] === 'string'
      ? props.indexPatterns?.[0]
      : props.indexPatterns?.[0]?.title ?? ''
  );

  const search = getSearchService();

  const onButtonClick = () => setIsOpen(!isOpen);
  const closePopover = () => setIsOpen(false);

  const handleDataSetChange = (dataSet: any, indexPattern?: IIndexPattern | string) => {
    if (indexPattern) {
      setSelectedDataSet(typeof indexPattern === 'string' ? indexPattern : indexPattern.title);
    } else {
      setSelectedDataSet(
        selectedCluster ? `${selectedCluster.attributes.title}::${dataSet.name}` : dataSet.name
      );
    }
    props.onSelectDataSet(dataSet);
    closePopover();
  };

  useEffect(() => {
    // Fetch clusters
    fetchClusters(props.savedObjectsClient).then((res) => {
      setClusterList(res.savedObjects);
    });
  }, [props.savedObjectsClient, search, selectedCluster]);

  useEffect(() => {
    if (selectedCluster) {
      // Fetch indices
      fetchIndices(search, selectedCluster.id).then((res) => {
        // Assuming res is the array to iterate over
        const updatedRes = res.map((index: any) => ({
          ...index,
          dataSourceRef: selectedCluster.id,
        }));
        setIndexList(updatedRes);
      });
    }
  }, [selectedCluster, search]);

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          className="dataExplorerDSSelect"
          color="text"
          iconType="arrowDown"
          iconSide="right"
          onClick={onButtonClick}
        >
          {selectedDataSet ? selectedDataSet : 'Datasets'}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId={0}
        className="datasetNavigator"
        panels={[
          {
            id: 0,
            title: 'DATA',
            items: [
              {
                name: indexPatternsLabel,
                panel: 1,
              },
              ...clusterList.map((cluster) => ({
                name: cluster.attributes.title,
                panel: 2,
                onClick: () => setSelectedCluster(cluster),
              })),
            ],
          },
          {
            id: 1,
            title: indexPatternsLabel,
            items: props.indexPatterns?.map((indexPattern) => ({
              name: typeof indexPattern === 'string' ? indexPattern : indexPattern.title,
              onClick: () => {
                setSelectedCluster(null);
                handleDataSetChange(indexPattern);
              },
            })),
          },
          {
            id: 2,
            title: selectedCluster ? selectedCluster.attributes.title : 'Cluster',
            items: [
              {
                name: 'Indexes',
                panel: 3,
              },
            ],
          },
          {
            id: 3,
            title: selectedCluster ? selectedCluster.attributes.title : 'Cluster',
            items: indexList.map((index: any) => ({
              name: index.name,
              onClick: () => handleDataSetChange(index),
            })),
          },
        ]}
      />
    </EuiPopover>
  );
};
