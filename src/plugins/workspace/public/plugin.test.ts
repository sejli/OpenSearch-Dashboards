/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { coreMock } from 'opensearch-dashboards/public/mocks';
import {
  ChromeBreadcrumb,
  NavGroupStatus,
  DEFAULT_NAV_GROUPS,
  AppNavLinkStatus,
  WorkspaceAvailability,
  AppStatus,
  WorkspaceError,
} from 'opensearch-dashboards/public';
import { WORKSPACE_FATAL_ERROR_APP_ID, WORKSPACE_DETAIL_APP_ID } from '../common/constants';
import { savedObjectsManagementPluginMock } from '../../saved_objects_management/public/mocks';
import { managementPluginMock } from '../../management/public/mocks';
import { UseCaseService, WorkspaceCollaboratorTypesService } from './services';
import { workspaceClientMock, WorkspaceClientMock } from './workspace_client.mock';
import { WorkspacePlugin } from './plugin';
import { contentManagementPluginMocks } from '../../content_management/public';
import { navigationPluginMock } from '../../navigation/public/mocks';
import * as registerDefaultCollaboratorTypesExports from './register_default_collaborator_types';
import { AddCollaboratorsModal } from './components/add_collaborators_modal';

// Expect 8 app registrations: create, fatal error, detail, initial, navigation, collaborator, list apps and workspace parent menu.
const registrationAppNumber = 8;

describe('Workspace plugin', () => {
  const getMockDependencies = () => ({
    contentManagement: contentManagementPluginMocks.createStartContract(),
    navigation: navigationPluginMock.createStartContract(),
  });
  const getSetupMock = () => coreMock.createSetup();

  beforeEach(() => {
    WorkspaceClientMock.mockClear();
    Object.values(workspaceClientMock).forEach((item) => item.mockClear());
  });

  it('#setup', async () => {
    const setupMock = getSetupMock();
    const savedObjectManagementSetupMock = savedObjectsManagementPluginMock.createSetupContract();
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {
      savedObjectsManagement: savedObjectManagementSetupMock,
      management: managementPluginMock.createSetupContract(),
    });
    expect(setupMock.application.register).toBeCalledTimes(registrationAppNumber);
    expect(WorkspaceClientMock).toBeCalledTimes(1);
    expect(savedObjectManagementSetupMock.columns.register).toBeCalledTimes(1);
  });

  it('#call savedObjectsClient.setCurrentWorkspace when current workspace id changed', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});
    workspacePlugin.start(coreStart, getMockDependencies());
    coreStart.workspaces.currentWorkspaceId$.next('foo');
    expect(coreStart.savedObjects.client.setCurrentWorkspace).toHaveBeenCalledWith('foo');
    expect(setupMock.application.register).toBeCalledTimes(registrationAppNumber);
    expect(WorkspaceClientMock).toBeCalledTimes(1);
    expect(workspaceClientMock.enterWorkspace).toBeCalledTimes(0);
  });

  it('#setup should register workspace list with a visible application and register to settingsAndSetup nav group', async () => {
    const setupMock = coreMock.createSetup();
    setupMock.chrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {});

    expect(setupMock.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace_list',
        navLinkStatus: AppNavLinkStatus.visible,
      })
    );
    expect(setupMock.chrome.navGroup.addNavLinksToGroup).toHaveBeenCalledWith(
      DEFAULT_NAV_GROUPS.settingsAndSetup,
      expect.arrayContaining([
        {
          id: 'workspace_list',
          order: 350,
          title: 'Workspaces',
        },
      ])
    );
  });

  it('#setup should register workspace detail with a hidden application and not register to all nav group', async () => {
    const setupMock = coreMock.createSetup();
    setupMock.chrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {});

    expect(setupMock.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace_detail',
      })
    );

    // not register to all nav group
    expect(setupMock.chrome.navGroup.addNavLinksToGroup).not.toHaveBeenCalledWith(
      DEFAULT_NAV_GROUPS.all,
      expect.arrayContaining([
        {
          id: 'workspace_detail',
          title: 'Overview',
          order: 100,
        },
      ])
    );
  });

  it('#setup should register workspace initial with a visible application', async () => {
    const setupMock = coreMock.createSetup();
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {});

    expect(setupMock.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace_initial',
        navLinkStatus: AppNavLinkStatus.hidden,
      })
    );
  });

  it('#setup should register registerCollapsibleNavHeader when enter a workspace', async () => {
    const windowSpy = jest.spyOn(window, 'window', 'get');
    windowSpy.mockImplementation(
      () =>
        ({
          location: {
            href: 'http://localhost/w/workspaceId/app',
          },
        } as any)
    );
    workspaceClientMock.enterWorkspace.mockResolvedValueOnce({
      success: true,
      result: null,
    });
    const setupMock = coreMock.createSetup();
    let collapsibleNavHeaderImplementation = () => null;
    setupMock.chrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
    setupMock.chrome.registerCollapsibleNavHeader.mockImplementation(
      (func) => (collapsibleNavHeaderImplementation = func)
    );
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {});
    expect(collapsibleNavHeaderImplementation()).toEqual(null);
    const startMock = coreMock.createStart();
    await workspacePlugin.start(startMock, getMockDependencies());
    expect(collapsibleNavHeaderImplementation()).not.toEqual(null);
    windowSpy.mockRestore();
  });

  it('#setup should register workspace essential use case when new home is disabled', async () => {
    const setupMock = {
      ...coreMock.createSetup(),
      chrome: {
        ...coreMock.createSetup().chrome,
        navGroup: {
          ...coreMock.createSetup().chrome.navGroup,
          getNavGroupEnabled: jest.fn().mockReturnValue(false),
        },
      },
    };
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {
      contentManagement: {
        registerPage: jest.fn(),
      },
    });

    expect(setupMock.application.register).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'essential_overview',
      })
    );
    expect(setupMock.application.register).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'analytics_all_overview',
      })
    );
  });

  it('#setup should register workspace essential use case when new nav is enabled', async () => {
    const setupMock = {
      ...coreMock.createSetup(),
      chrome: {
        ...coreMock.createSetup().chrome,
        navGroup: {
          ...coreMock.createSetup().chrome.navGroup,
          getNavGroupEnabled: jest.fn().mockReturnValue(true),
        },
      },
    };
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {
      contentManagement: {
        registerPage: jest.fn(),
      },
    });

    expect(setupMock.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'essentials_overview',
      })
    );
  });

  it('#setup should register workspace analytics(All) use case when new nav is enabled', async () => {
    const setupMock = {
      ...coreMock.createSetup(),
      chrome: {
        ...coreMock.createSetup().chrome,
        navGroup: {
          ...coreMock.createSetup().chrome.navGroup,
          getNavGroupEnabled: jest.fn().mockReturnValue(true),
        },
      },
    };
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {
      contentManagement: {
        registerPage: jest.fn(),
      },
    });
  });

  it('#setup should register workspace navigation with a visible application', async () => {
    const setupMock = coreMock.createSetup();
    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(setupMock, {});
    expect(setupMock.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace_navigation',
        navLinkStatus: AppNavLinkStatus.hidden,
      })
    );
  });

  it('#setup should call registerDefaultCollaboratorTypes', async () => {
    const registerDefaultCollaboratorTypesMock = jest.fn();
    jest
      .spyOn(registerDefaultCollaboratorTypesExports, 'registerDefaultCollaboratorTypes')
      .mockImplementationOnce(registerDefaultCollaboratorTypesMock);
    const setupMock = coreMock.createSetup();
    const workspacePlugin = new WorkspacePlugin();
    expect(registerDefaultCollaboratorTypesMock).not.toHaveBeenCalled();
    await workspacePlugin.setup(setupMock, {});
    expect(registerDefaultCollaboratorTypesMock).toHaveBeenCalled();
  });

  it('#setup should return WorkspaceCollaboratorTypesService', async () => {
    const setupMock = coreMock.createSetup();
    const workspacePlugin = new WorkspacePlugin();
    const result = await workspacePlugin.setup(setupMock, {});

    expect(result.collaboratorTypes).toBeInstanceOf(WorkspaceCollaboratorTypesService);
  });

  it('#setup should return getAddCollaboratorsModal method', async () => {
    const setupMock = coreMock.createSetup();
    const workspacePlugin = new WorkspacePlugin();
    const result = await workspacePlugin.setup(setupMock, {});

    expect(result.ui.AddCollaboratorsModal).toBe(AddCollaboratorsModal);
  });

  it('#start should handle fatal error when workspace is stale', async () => {
    const windowSpy = jest.spyOn(window, 'window', 'get');
    windowSpy.mockImplementation(
      () =>
        ({
          location: {
            href: 'http://localhost/w/workspaceId/app',
          },
        } as any)
    );

    const setupMock = coreMock.createSetup();

    const workspacePlugin = new WorkspacePlugin();

    await workspacePlugin.setup(setupMock, {});

    expect(WorkspaceClientMock).toBeCalledTimes(1);
    expect(workspaceClientMock.enterWorkspace).toBeCalledWith('workspaceId');

    const startMock = coreMock.createStart();
    startMock.application.currentAppId$ = new BehaviorSubject(WORKSPACE_DETAIL_APP_ID);
    workspacePlugin.start(startMock, getMockDependencies());

    startMock.workspaces.workspaceError$.next(WorkspaceError.WORKSPACE_IS_STALE);
    startMock.workspaces.initialized$.next(true);

    expect(startMock.application.navigateToApp).toBeCalledWith(WORKSPACE_FATAL_ERROR_APP_ID, {
      replace: true,
      state: {
        error: 'Cannot find current workspace since it is stale',
      },
    });
    windowSpy.mockRestore();
  });

  it('#start when workspace id is in url and enterWorkspace return success', async () => {
    const windowSpy = jest.spyOn(window, 'window', 'get');
    windowSpy.mockImplementation(
      () =>
        ({
          location: {
            href: 'http://localhost/w/workspaceId/app',
          },
        } as any)
    );
    workspaceClientMock.enterWorkspace.mockResolvedValue({
      success: true,
      result: null,
    });

    const workspacePlugin = new WorkspacePlugin();
    await workspacePlugin.setup(getSetupMock(), {});

    expect(WorkspaceClientMock).toBeCalledTimes(1);
    expect(workspaceClientMock.enterWorkspace).toBeCalledWith('workspaceId');

    const startMock = coreMock.createStart();
    workspacePlugin.start(startMock, getMockDependencies());

    // Simulate on error page but no errror case
    startMock.application.currentAppId$ = new BehaviorSubject(WORKSPACE_FATAL_ERROR_APP_ID);
    startMock.workspaces.initialized$.next(true);

    expect(startMock.application.navigateToApp).toBeCalledWith(WORKSPACE_DETAIL_APP_ID);
    windowSpy.mockRestore();
  });

  it('#start when workspace id is in url and enterWorkspace return error', async () => {
    const windowSpy = jest.spyOn(window, 'window', 'get');
    windowSpy.mockImplementation(
      () =>
        ({
          location: {
            href: 'http://localhost/w/workspaceId/app',
          },
        } as any)
    );

    const workspacePlugin = new WorkspacePlugin();

    await workspacePlugin.setup(getSetupMock(), {});

    expect(WorkspaceClientMock).toBeCalledTimes(1);
    expect(workspaceClientMock.enterWorkspace).toBeCalledWith('workspaceId');

    const startMock = coreMock.createStart();
    startMock.application.currentAppId$ = new BehaviorSubject(WORKSPACE_DETAIL_APP_ID);
    workspacePlugin.start(startMock, getMockDependencies());

    // Simulate the workspace error case
    startMock.workspaces.initialized$.next(true);
    startMock.workspaces.workspaceError$.next('error');

    expect(startMock.application.navigateToApp).toBeCalledWith(WORKSPACE_FATAL_ERROR_APP_ID, {
      replace: true,
      state: {
        error: 'error',
      },
    });

    windowSpy.mockRestore();
  });

  it('#start add workspace detail page to breadcrumbs when start', async () => {
    const startMock = coreMock.createStart();
    const workspaceObject = {
      id: 'foo',
      name: 'bar',
    };
    startMock.workspaces.currentWorkspace$.next(workspaceObject);
    const breadcrumbs = new BehaviorSubject<ChromeBreadcrumb[]>([{ text: 'dashboards' }]);
    startMock.chrome.getBreadcrumbs$.mockReturnValue(breadcrumbs);
    const workspacePlugin = new WorkspacePlugin();
    workspacePlugin.start(startMock, getMockDependencies());
    expect(startMock.chrome.setBreadcrumbs).toBeCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'bar',
        }),
        expect.objectContaining({
          text: 'Home',
        }),
      ])
    );
  });

  it('#start do not add workspace detail page to breadcrumbs when already exists', async () => {
    const startMock = coreMock.createStart();
    const workspaceObject = {
      id: 'foo',
      name: 'bar',
    };
    startMock.workspaces.currentWorkspace$.next(workspaceObject);
    const breadcrumbs = new BehaviorSubject<ChromeBreadcrumb[]>([
      { text: 'home' },
      { text: 'bar' },
    ]);
    startMock.chrome.getBreadcrumbs$.mockReturnValue(breadcrumbs);
    const workspacePlugin = new WorkspacePlugin();
    workspacePlugin.start(startMock, getMockDependencies());
    expect(startMock.chrome.setBreadcrumbs).not.toHaveBeenCalled();
  });

  it('#start should register workspace list card into new home page', async () => {
    const startMock = coreMock.createStart();
    startMock.chrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
    const workspacePlugin = new WorkspacePlugin();
    const mockDependencies = getMockDependencies();
    workspacePlugin.start(startMock, mockDependencies);
    expect(mockDependencies.contentManagement.registerContentProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace_list_card_home',
      })
    );
  });

  it('#start should call navGroupUpdater$.next after currentWorkspace set', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});

    expect(setupMock.chrome.navGroup.registerNavGroupUpdater).toHaveBeenCalled();
    const navGroupUpdater$ = setupMock.chrome.navGroup.registerNavGroupUpdater.mock.calls[0][0];

    expect(navGroupUpdater$).toBeTruthy();
    jest.spyOn(navGroupUpdater$, 'next');

    expect(navGroupUpdater$.next).not.toHaveBeenCalled();
    workspacePlugin.start(coreStart, getMockDependencies());
    coreStart.workspaces.currentWorkspace$.next({
      id: 'foo',
      name: 'foo',
    });

    expect(navGroupUpdater$.next).toHaveBeenCalled();
  });

  it('#start should not update systematic use case features after currentWorkspace set', async () => {
    const registeredUseCases$ = new BehaviorSubject([
      {
        id: 'foo',
        title: 'Foo',
        features: [{ id: 'system-feature', title: 'System feature' }],
        systematic: true,
        description: '',
      },
    ]);
    jest.spyOn(UseCaseService.prototype, 'start').mockImplementationOnce(() => ({
      getRegisteredUseCases$: jest.fn(() => registeredUseCases$),
    }));
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});
    const workspaceObject = {
      id: 'foo',
      name: 'bar',
      features: ['baz'],
    };
    coreStart.workspaces.currentWorkspace$.next(workspaceObject);

    const appUpdater$ = setupMock.application.registerAppUpdater.mock.calls[0][0];

    workspacePlugin.start(coreStart, getMockDependencies());

    const appUpdater = await appUpdater$.pipe(first()).toPromise();

    expect(appUpdater({ id: 'system-feature', title: '', mount: () => () => {} })).toBeUndefined();
  });

  it('#start should update nav group status after currentWorkspace set', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});
    const workspaceObject = {
      id: 'foo',
      name: 'bar',
      features: ['use-case-foo'],
    };
    coreStart.workspaces.currentWorkspace$.next(workspaceObject);

    const navGroupUpdater$ = setupMock.chrome.navGroup.registerNavGroupUpdater.mock.calls[0][0];

    workspacePlugin.start(coreStart, getMockDependencies());

    const navGroupUpdater = await navGroupUpdater$.pipe(first()).toPromise();

    expect(navGroupUpdater({ id: 'foo' })).toBeUndefined();
    expect(navGroupUpdater({ id: 'bar' })).toEqual({
      status: NavGroupStatus.Hidden,
    });
  });

  it('#start should not be able to access app of which workspaceAvailability is set to insideWorkspace when out of workspace', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});
    coreStart.workspaces.currentWorkspace$.next(null);

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      dashboard: {
        isDashboardAdmin: false,
      },
    };

    workspacePlugin.start(coreStart, getMockDependencies());

    const mockApp = {
      id: 'dashboards',
      workspaceAvailability: WorkspaceAvailability.insideWorkspace,
    } as any;

    const appUpdater$ = setupMock.application.registerAppUpdater.mock.calls[0][0];

    const appState = await appUpdater$.pipe(first()).toPromise();
    expect(appState(mockApp)).toEqual({ status: AppStatus.inaccessible });
  });

  it('#start should remove non-workspace chrome page search service', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});

    workspacePlugin.start(coreStart, getMockDependencies());

    expect(coreStart.chrome.globalSearch.unregisterSearchCommand).toBeCalledWith('pagesSearch');
  });

  it('#start should update collaboratorsAppUpdater correctly if permission enabled', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});

    const appUpdaterSpy = jest.spyOn((workspacePlugin as any).collaboratorsAppUpdater$, 'next');

    const startMock = {
      ...coreStart,
      chrome: {
        ...coreStart.chrome,
        navGroup: {
          ...coreStart.chrome.navGroup,
          getNavGroupEnabled: jest.fn().mockReturnValue(true),
        },
      },
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          workspaces: {
            ...coreStart.application.capabilities.workspaces,
            permissionEnabled: true,
          },
        },
      },
    };

    workspacePlugin.start(startMock, getMockDependencies());

    expect(appUpdaterSpy).toHaveBeenCalled();
    const updaterFn = appUpdaterSpy.mock.calls[0][0];
    const result = (updaterFn as any)();

    expect(result).toStrictEqual({
      status: AppStatus.accessible,
      navLinkStatus: AppNavLinkStatus.visible,
    });
  });

  it('#start should update collaboratorsAppUpdater correctly if permission disabled', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});

    const appUpdaterSpy = jest.spyOn((workspacePlugin as any).collaboratorsAppUpdater$, 'next');

    const startMock = {
      ...coreStart,
      chrome: {
        ...coreStart.chrome,
        navGroup: {
          ...coreStart.chrome.navGroup,
          getNavGroupEnabled: jest.fn().mockReturnValue(false),
        },
      },
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          workspaces: {
            ...coreStart.application.capabilities.workspaces,
            permissionEnabled: false,
          },
        },
      },
    };

    workspacePlugin.start(startMock, getMockDependencies());

    expect(appUpdaterSpy).toHaveBeenCalled();
    const updaterFn = appUpdaterSpy.mock.calls[0][0];
    const result = (updaterFn as any)();

    expect(result).toStrictEqual({
      status: AppStatus.inaccessible,
      navLinkStatus: AppNavLinkStatus.hidden,
    });
  });

  it('#stop should call unregisterNavGroupUpdater', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const unregisterNavGroupUpdater = jest.fn();
    setupMock.chrome.navGroup.registerNavGroupUpdater.mockReturnValueOnce(
      unregisterNavGroupUpdater
    );
    await workspacePlugin.setup(setupMock, {});

    workspacePlugin.stop();

    expect(unregisterNavGroupUpdater).toHaveBeenCalled();
  });

  it('#stop should not call appUpdater$.next anymore', async () => {
    const registeredUseCases$ = new BehaviorSubject([
      {
        id: 'foo',
        title: 'Foo',
        features: [
          {
            id: 'system-feature',
          },
        ],
        systematic: true,
        description: '',
      },
    ]);
    jest.spyOn(UseCaseService.prototype, 'start').mockImplementationOnce(() => ({
      getRegisteredUseCases$: jest.fn(() => registeredUseCases$),
    }));
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const coreStart = coreMock.createStart();
    await workspacePlugin.setup(setupMock, {});
    const workspaceObject = {
      id: 'foo',
      name: 'bar',
      features: ['baz'],
    };
    coreStart.workspaces.currentWorkspace$.next(workspaceObject);

    const appUpdater$ = setupMock.application.registerAppUpdater.mock.calls[0][0];
    const appUpdaterChangeMock = jest.fn();
    appUpdater$.subscribe(appUpdaterChangeMock);

    workspacePlugin.start(coreStart, getMockDependencies());

    // Wait for filterNav been executed
    await new Promise(setImmediate);

    expect(appUpdaterChangeMock).toHaveBeenCalledTimes(2);

    workspacePlugin.stop();

    registeredUseCases$.next([]);
    expect(appUpdaterChangeMock).toHaveBeenCalledTimes(2);
  });

  it('#stop should call collaboratorTypesService.stop', async () => {
    const workspacePlugin = new WorkspacePlugin();
    const setupMock = getSetupMock();
    const stopMock = jest.fn();
    jest
      .spyOn(WorkspaceCollaboratorTypesService.prototype, 'stop')
      .mockImplementationOnce(stopMock);
    await workspacePlugin.setup(setupMock, {});

    expect(stopMock).not.toHaveBeenCalled();
    workspacePlugin.stop();
    expect(stopMock).toHaveBeenCalled();
  });
});
