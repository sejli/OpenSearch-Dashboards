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

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiLink,
  // @ts-expect-error TS6133 TODO(ts-error): fixme
  EuiIcon,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { MarkdownVisParams } from './types';

function MarkdownOptions({ stateParams, setValue }: VisOptionsProps<MarkdownVisParams>) {
  const onMarkdownUpdate = useCallback(
    (value: MarkdownVisParams['markdown']) => setValue('markdown', value),
    [setValue]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup direction="column" gutterSize="m" className="eui-fullHeight">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  <label htmlFor="markdownVisInput">Markdown</label>
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiLink
                  href="https://help.github.com/articles/github-flavored-markdown/"
                  target="_blank"
                >
                  <FormattedMessage
                    id="visTypeMarkdown.params.helpLinkLabel"
                    defaultMessage="Help"
                  />{' '}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCompressedTextArea
            id="markdownVisInput"
            className="eui-fullHeight"
            value={stateParams.markdown}
            onChange={({ target: { value } }) => onMarkdownUpdate(value)}
            fullWidth={true}
            data-test-subj="markdownTextarea"
            resize="none"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export { MarkdownOptions };
