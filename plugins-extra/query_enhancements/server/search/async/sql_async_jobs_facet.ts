/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export class SQLAsyncJobsFacet {
  constructor(private client: any) {
    this.client = client;
  }

  private fetch = async (request: any, format: string, responseFormat: string) => {
    const res = {
      success: false,
      data: {},
    };
    try {
      console.log('request in jobs facet', request);
      const queryRes = await this.client
        .asScoped(request)
        .callAsCurrentUser(format, { queryId: request.params.queryId });
      res.success = true;
      res.data = queryRes;
    } catch (err: any) {
      console.error('Async SQL job status fetch err:', err);
      res.data = err;
    }
    console.log('res in jobs facet', res);
    return res;
  };

  describeQuery = async (request: any) => {
    return this.fetch(request, 'observability.getJobStatus', 'json');
  };
}
