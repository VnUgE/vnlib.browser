// Copyright (c) 2022 Vaughn Nugent
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

import _ from 'lodash'
import { reactive, computed, readonly } from 'vue'

export const useDataBuffer = function(initialData){

  const buffer = reactive(_.clone(initialData || {}))
  const data = reactive(_.clone(initialData || {}))

  //Modified tracks whether the buffer has been modified from the data
  const modified = computed(() => !_.isEqual(buffer, data))
  const apply = (newData) => {
    // Apply the new data to the buffer
    _.assign(data, newData);
    // Revert the buffer to the resource data
    _.assign(buffer, data)
  }

  const revert = () => _.assign(buffer, data)

  return {
    buffer,
    data:readonly(data),
    modified,
    apply,
    revert
  }
}
