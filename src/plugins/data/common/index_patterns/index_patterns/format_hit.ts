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

import _ from 'lodash';
import { IndexPattern } from './index_pattern';
import { FieldFormatsContentType } from '../../../common';

const formattedCache = new WeakMap();
const partialFormattedCache = new WeakMap();

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formatted version
export function formatHitProvider(indexPattern: IndexPattern, defaultFormat: any) {
  function convert(
    hit: Record<string, any>,
    val: any,
    fieldName: string,
    type: FieldFormatsContentType
  ) {
    const field = indexPattern.fields.getByName(fieldName);
    const format = field ? indexPattern.getFormatterForField(field) : defaultFormat;

    return format.convert(val, type, { field, hit, indexPattern });
  }

  function formatHit(hit: Record<string, any>, type: FieldFormatsContentType = 'html') {
    // Cache is only used for formatType === 'html' (default)
    if (type === 'text') {
      const flattened = indexPattern.flattenHit(hit);
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(flattened)) {
        result[key] = convert(hit, value, key, type);
      }
      return result;
    }

    const cached = formattedCache.get(hit);
    if (cached) {
      return cached;
    }

    // use and update the partial cache, but don't rewrite it.
    // _source is stored in partialFormattedCache but not formattedCache
    const partials = partialFormattedCache.get(hit) || {};
    partialFormattedCache.set(hit, partials);

    const cache: Record<string, any> = {};
    formattedCache.set(hit, cache);

    _.forOwn(indexPattern.flattenHit(hit), function (val: any, fieldName?: string) {
      // sync the formatted and partial cache
      if (!fieldName) {
        return;
      }
      const formatted =
        partials[fieldName] == null ? convert(hit, val, fieldName, type) : partials[fieldName];
      cache[fieldName] = partials[fieldName] = formatted;
    });

    return cache;
  }

  formatHit.formatField = function (
    hit: Record<string, any>,
    fieldName: string,
    type: FieldFormatsContentType = 'html'
  ) {
    // Cache is only used for formatType === 'html' (default)
    if (type === 'html') {
      let partials = partialFormattedCache.get(hit);
      if (partials && partials[fieldName] != null) {
        return partials[fieldName];
      }

      if (!partials) {
        partials = {};
        partialFormattedCache.set(hit, partials);
      }
    }

    const val = fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
    return convert(hit, val, fieldName, type);
  };

  return formatHit;
}
