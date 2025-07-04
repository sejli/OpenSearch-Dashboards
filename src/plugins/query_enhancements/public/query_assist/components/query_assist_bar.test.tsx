/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { ComponentProps, PropsWithChildren } from 'react';
import { IntlProvider } from 'react-intl';
import { of } from 'rxjs';
import { QueryAssistBar } from '.';
import { uiActionsPluginMock } from 'src/plugins/ui_actions/public/mocks';
import { notificationServiceMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';
import { DataStorage } from '../../../../data/common';
import { QueryEditorExtensionDependencies, QueryStringContract } from '../../../../data/public';
import { dataPluginMock } from '../../../../data/public/mocks';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { setData, setStorage, setUiActions } from '../../services';
import { useGenerateQuery } from '../hooks';
import { AgentError, ProhibitedQueryError } from '../utils';
import { QueryAssistInput } from './query_assist_input';

jest.mock('../../../../opensearch_dashboards_react/public', () => ({
  useOpenSearchDashboards: jest.fn(),
  withOpenSearchDashboards: jest.fn((component: React.Component) => component),
}));

jest.mock('../hooks', () => ({
  useGenerateQuery: jest.fn().mockReturnValue({ generateQuery: jest.fn(), loading: false }),
  useQueryAssist: jest.fn().mockReturnValue({ updateQueryState: jest.fn() }),
}));

jest.mock('./query_assist_input', () => ({
  QueryAssistInput: ({ inputRef, error, placeholder }: ComponentProps<typeof QueryAssistInput>) => (
    <>
      <input placeholder={placeholder} ref={inputRef} />
      <div>{JSON.stringify(error)}</div>
    </>
  ),
}));

const dataMock = dataPluginMock.createStartContract(true);
const queryStringMock = dataMock.query.queryString as jest.Mocked<QueryStringContract>;
const uiSettingsMock = uiSettingsServiceMock.createStartContract();
const notificationsMock = notificationServiceMock.createStartContract();

setData(dataMock);
setStorage(new DataStorage(window.localStorage, 'mock-prefix'));

const dependencies: QueryEditorExtensionDependencies = {
  language: 'PPL',
  onSelectLanguage: jest.fn(),
  isCollapsed: false,
  setIsCollapsed: jest.fn(),
  query: {
    query: '',
    language: '',
    dataset: {
      type: 'INDEX_PATTERN',
      id: '',
      title: '',
    },
  },
};

type Props = ComponentProps<typeof QueryAssistBar>;

const IntlWrapper = ({ children }: PropsWithChildren<unknown>) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const uiActionsStartMock = uiActionsPluginMock.createStartContract();
// @ts-expect-error TS2345 TODO(ts-error): fixme
uiActionsStartMock.getTrigger.mockReturnValue({
  id: '',
  exec: jest.fn(),
});

setUiActions(uiActionsStartMock);

const renderQueryAssistBar = (overrideProps: Partial<Props> = {}) => {
  const props: Props = Object.assign<Props, Partial<Props>>({ dependencies }, overrideProps);
  const component = render(<QueryAssistBar {...props} />, {
    wrapper: IntlWrapper,
  });
  return { component, props: props as jest.MockedObjectDeep<Props> };
};

describe('QueryAssistBar', () => {
  beforeEach(() => {
    (useOpenSearchDashboards as jest.Mock).mockReturnValue({
      services: {
        data: dataMock,
        uiSettings: uiSettingsMock,
        notifications: notificationsMock,
      },
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders null if collapsed', () => {
    const { component } = renderQueryAssistBar({
      dependencies: { ...dependencies, isCollapsed: true },
    });
    expect(component.container).toBeEmptyDOMElement();
  });

  it('matches snapshot', () => {
    const { component } = renderQueryAssistBar();
    expect(component.container).toMatchSnapshot();
  });

  it('displays callout when query input is empty on submit', async () => {
    renderQueryAssistBar();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('query-assist-empty-query-callout')).toBeInTheDocument();
    });
  });

  it('displays callout when dataset is not selected on submit', async () => {
    queryStringMock.getQuery.mockReturnValueOnce({
      query: '',
      language: 'kuery',
      dataset: { type: 'INDEX_PATTERN', id: '', title: '' },
    });
    queryStringMock.getUpdates$.mockReturnValueOnce(
      of({
        query: '',
        language: 'kuery',
        dataset: { type: 'INDEX_PATTERN', id: '', title: '' },
      })
    );
    renderQueryAssistBar();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('query-assist-empty-index-callout')).toBeInTheDocument();
    });
  });

  it('displays callout for guardrail errors', async () => {
    const generateQueryMock = jest.fn().mockResolvedValue({ error: new ProhibitedQueryError() });
    (useGenerateQuery as jest.Mock).mockReturnValue({
      generateQuery: generateQueryMock,
      loading: false,
    });

    renderQueryAssistBar();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('query-assist-guard-callout')).toBeInTheDocument();
    });
  });

  it('display callout for AgentError', async () => {
    const generateQueryMock = jest.fn().mockResolvedValue({
      error: new AgentError({
        error: { type: 'mock-type', reason: 'mock-reason', details: 'mock-details' },
        status: 404,
      }),
    });
    (useGenerateQuery as jest.Mock).mockReturnValue({
      generateQuery: generateQueryMock,
      loading: false,
    });
    renderQueryAssistBar();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'false query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('query-assist-guard-callout')).toBeInTheDocument();
    });
  });

  it('passes agent errors to input', async () => {
    const generateQueryMock = jest.fn().mockResolvedValue({
      error: new AgentError({
        error: { type: 'mock-type', reason: 'mock-reason', details: 'mock-details' },
        status: 303,
      }),
    });
    (useGenerateQuery as jest.Mock).mockReturnValue({
      generateQuery: generateQueryMock,
      loading: false,
    });

    renderQueryAssistBar();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/mock-reason/)).toBeInTheDocument();
    });
  });

  it('displays toast for other unknown errors', async () => {
    const mockError = new Error('mock-error');
    const generateQueryMock = jest.fn().mockResolvedValue({
      error: mockError,
    });
    (useGenerateQuery as jest.Mock).mockReturnValue({
      generateQuery: generateQueryMock,
      loading: false,
    });

    renderQueryAssistBar();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(notificationsMock.toasts.addError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to generate results',
      });
    });
  });

  it('submits a valid query and updates services', async () => {
    const generateQueryMock = jest
      .fn()
      .mockResolvedValue({ response: { query: 'generated query' } });
    (useGenerateQuery as jest.Mock).mockReturnValue({
      generateQuery: generateQueryMock,
      loading: false,
    });

    renderQueryAssistBar();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(generateQueryMock).toHaveBeenCalledWith({
        question: 'test query',
        index: 'Default Index Pattern',
        language: 'PPL',
        dataSourceId: 'mock-data-source-id',
      });
    });

    expect(queryStringMock.setQuery).toHaveBeenCalledWith(
      {
        dataset: {
          dataSource: {
            id: 'mock-data-source-id',
            title: 'Default Data Source',
            type: 'OpenSearch',
          },
          id: 'default-index-pattern',
          timeFieldName: '@timestamp',
          title: 'Default Index Pattern',
          type: 'INDEX_PATTERN',
        },
        language: 'PPL',
        query: 'generated query',
      },
      true
    );
    expect(screen.getByTestId('query-assist-query-generated-callout')).toBeInTheDocument();
  });

  it('should show unsupported placeholder when dataset is not supported', async () => {
    const mockedQuery = {
      query: '',
      language: 'kuery',
      dataset: {
        id: 'foo',
        title: 'mock',
        type: 'S3',
      },
    };
    queryStringMock.getUpdates$.mockReturnValueOnce(of(mockedQuery));
    const { component } = renderQueryAssistBar({
      dependencies: {
        ...dependencies,
        query: mockedQuery,
      },
    });

    await component.findByPlaceholderText(
      'Query Assist is not supported by mock. Please select another data source that is compatible to start entering questions or enter PPL below.'
    );
  });
});
