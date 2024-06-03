import { trimEnd } from 'lodash';
import { Observable, from } from 'rxjs';
import { stringify } from '@osd/std';
import {
  DataPublicPluginStart,
  IOpenSearchDashboardsSearchRequest,
  IOpenSearchDashboardsSearchResponse,
  ISearchOptions,
  SearchInterceptor,
  SearchInterceptorDeps,
} from '../../../../src/plugins/data/public';
import { SQL_SEARCH_STRATEGY } from '../../common';
import { QlDashboardsPluginStartDependencies } from '../types';
import { i18n } from '@osd/i18n';

export class SQLAsyncQlSearchInterceptor extends SearchInterceptor {
  protected queryService!: DataPublicPluginStart['query'];
  protected aggsService!: DataPublicPluginStart['search']['aggs'];

  constructor(deps: SearchInterceptorDeps) {
    super(deps);

    deps.startServices.then(([coreStart, depsStart]) => {
      this.queryService = (depsStart as QlDashboardsPluginStartDependencies).data.query;
      this.aggsService = (depsStart as QlDashboardsPluginStartDependencies).data.search.aggs;
    });
  }

  protected runSearch(
    request: IOpenSearchDashboardsSearchRequest,
    signal?: AbortSignal,
    strategy?: string
  ): Observable<IOpenSearchDashboardsSearchResponse> {
    const { id, ...searchRequest } = request;
    const path = trimEnd('/api/sqlasyncql/jobs');
    console.log('searchRequest in search interceptor:', searchRequest);

    const fetchDataFrame = (queryString: string, df = null, session = undefined) => {
      console.log('queryString in search interceptor:', queryString);
      console.log('session in search interceptor:', session);
      const body = stringify({
        query: { qs: queryString, format: 'jdbc' },
        df,
        sessionId: session,
      });
      console.log('body in search interceptor:', body);
      return from(
        this.deps.http.fetch({
          method: 'POST',
          path,
          body,
          signal,
        })
      );
    };

    const fetchJobStatusDataFrame = (queryId: string) => {
      console.log('queryId in search interceptor:', queryId);
      return from(
        this.deps.http.fetch({
          method: 'GET',
          path: `${path}/${queryId}`,
        })
      );
    };

    let dataFrame;
    if (searchRequest.params.body.query.queries[0]?.queryId) {
      console.log('searchRequest contains queryId IN SEARCH INTERCEPTOR');
      dataFrame = fetchJobStatusDataFrame(searchRequest.params.body.query.queries[0]?.queryId);
    } else {
      dataFrame = fetchDataFrame(
        searchRequest.params.body.query.queries[0].query,
        searchRequest.params.body.df,
        searchRequest.params.body.query.queries[0].sessionId
      );
    }

    // subscribe to dataFrame to see if an error is returned, display a toast message if so
    dataFrame.subscribe((df) => {
      if (!df.body.error) {
        console.log('dataFrame in search interceptor after fetchDataFrame():', df);
      }
      if (!df.body.error) return;
      const jsError = new Error(df.body.error.response);
      this.deps.toasts.addError(jsError, {
        title: i18n.translate('dqlPlugin.sqlQueryError', {
          defaultMessage: 'Could not complete the SQL async query',
        }),
        toastMessage: df.body.error.msg,
      });
    });

    return dataFrame;
  }

  public search(request: IOpenSearchDashboardsSearchRequest, options: ISearchOptions) {
    console.log('running search in search interceptor');
    return this.runSearch(request, options.abortSignal, SQL_SEARCH_STRATEGY);
  }
}
