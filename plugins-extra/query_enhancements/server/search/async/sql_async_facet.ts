/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export class SQLAsyncFacet {
  constructor(private client: any) {
    this.client = client;
  }

  private fetch = async (request: any, format: string, responseFormat: string) => {
    const res = {
      success: false,
      data: {},
    };
    try {
      console.log('request.body in sql async facet:', request.body);
      const params = {
        body: {
          query: request.body.query,
          datasource: 'mys3',
          lang: 'sql',
          sessionId: request.body.sessionId,
        },
      };
      if (request.body.format !== 'jdbc') {
        params.format = request.body.format;
      }
      console.log('request in facet', request);
      console.log('params in facet', params);
      const queryRes = await this.client.asScoped(request).callAsCurrentUser(format, params);
      res.success = true;
      res.data = queryRes;
    } catch (err: any) {
      console.error('Async SQL query fetch err:', err);
      res.data = err;
    }
    console.log('res', res);
    return res;
  };

  describeQuery = async (request: any) => {
    return this.fetch(request, 'observability.runDirectQuery', 'json');
  };
}
