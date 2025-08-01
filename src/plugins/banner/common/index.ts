/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

export const PLUGIN_ID = 'banner';
export const PLUGIN_NAME = 'banner';

export * from './constants';

export interface BannerConfig {
  content: string;
  color: 'primary' | 'success' | 'warning';
  iconType?: string;
  isVisible: boolean;
  useMarkdown?: boolean;
  size?: 's' | 'm';
}
