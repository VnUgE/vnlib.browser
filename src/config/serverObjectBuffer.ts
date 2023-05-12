// Copyright (c) 2023 Vaughn Nugent
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { clone, isEqual, assign } from 'lodash'
import { reactive, computed } from 'vue'

const dataBuffer = <T extends object>(initialData : T) => {
  //Configure the initial data state and the buffer
  
  /**
   * The data is a reactive clone of the initial data state. It is used to store the current state of the resource.
   */
  const data = reactive(clone(initialData || {}))

  /**
   * The buffer is a reactive clone of the initial data state. It is used to track changes.
   */
  const buffer = reactive(clone(initialData || {}))

  /**
   * A computed value that indicates if the buffer has been modified from the data
   * @returns {boolean} True if the buffer has been modified from the data
   */
  const modified = computed(() => !isEqual(buffer, data))

  /**
   * Applies the new server response data to the resource data and reverts the buffer to the resource data
   * @param newData The new server response data to apply to the buffer
   */
  const apply = (newData: T):void => {
    // Apply the new data to the buffer
    assign(data, newData);
    // Revert the buffer to the resource data
    assign(buffer, data)
  }

  /**
   * Reverts the buffer to the resource data
   */
  const revert = () :void => {
    assign(buffer, data);
  }

  return{ data, buffer, modified, apply, revert }
}

/**
 * Configures a helper type that represents a data buffer that reflects the state of a resource
 * on the server. This is useful for editing forms, where the user may want to revert their
 * changes, or reload them from the server after an edit;
 * @param initialData 
 * @returns 
 */
export const useDataBuffer = <T extends object>(initialData: T) => dataBuffer(initialData);