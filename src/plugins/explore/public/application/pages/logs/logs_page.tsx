/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '../explore_page.scss';

import React from 'react';
import { EuiErrorBoundary, EuiPage, EuiPageBody } from '@elastic/eui';
import { AppMountParameters, HeaderVariant } from 'opensearch-dashboards/public';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { QueryPanel } from '../../../components/query_panel';
import { useInitialQueryExecution } from '../../utils/hooks/use_initial_query_execution';
import { useUrlStateSync } from '../../utils/hooks/use_url_state_sync';
import { useTimefilterSubscription } from '../../utils/hooks/use_timefilter_subscription';
import { useHeaderVariants } from '../../utils/hooks/use_header_variants';
import { NewExperienceBanner } from '../../../components/experience_banners/new_experience_banner';
import { useDatasetContext } from '../../context';
import { BottomContainer } from '../../../components/container/bottom_container';
import { TopNav } from '../../../components/top_nav/top_nav';
import { useInitPage } from '../../../application/utils/hooks/use_page_initialization';

/**
 * Main application component for the Explore plugin
 */
export const LogsPage: React.FC<Partial<Pick<AppMountParameters, 'setHeaderActionMenu'>>> = ({
  setHeaderActionMenu,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { dataset, isLoading } = useDatasetContext();
  const { savedExplore } = useInitPage();

  useInitialQueryExecution(services);
  useUrlStateSync(services);
  useTimefilterSubscription(services);
  useHeaderVariants(services, HeaderVariant.APPLICATION);

  return (
    <EuiErrorBoundary>
      <div className="mainPage">
        <EuiPage className="explore-layout" paddingSize="none" grow={false}>
          <EuiPageBody className="explore-layout__page-body">
            <TopNav setHeaderActionMenu={setHeaderActionMenu} savedExplore={savedExplore} />
            <NewExperienceBanner />

            <div className="dscCanvas__queryPanel">
              {dataset && !isLoading ? <QueryPanel /> : null}
            </div>

            {/* Main content area with resizable panels under QueryPanel */}
            <BottomContainer />
          </EuiPageBody>
        </EuiPage>
      </div>
    </EuiErrorBoundary>
  );
};
