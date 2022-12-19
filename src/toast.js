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
import { notify } from '@kyvg/vue3-notification'

const generalConfig = Object.freeze({
  group: 'general'
})
const formConfig = Object.freeze({
  group: 'form',
  ignoreDuplicates: true,
  // Froms only allow for one notification at a time
  max: 1,
  // Disable close on click
  closeOnClick: false
})

const general = {
  success(config) {
    config.type = 'success'
    _.assign(config, generalConfig)
    notify(config)
  },
  error(config) {
    config.type = 'error'
    _.assign(config, generalConfig)
    notify(config)
  },
  info(config) {
    config.type = 'info'
    _.assign(config, generalConfig)
    notify(config)
  }
}

const form = {
  success(config) {
    config.type = 'success'
    _.assign(config, formConfig)
    notify(config)
  },
  error(config) {
    config.type = 'error'
    _.assign(config, formConfig)
    notify(config)
  },
  info(config) {
    config.type = 'info'
    _.assign(config, formConfig)
    notify(config)
  }
}

/**
 * Gets the default toaster for general notifications
 * and the form toaster for form notifications
 * @returns {Object} The toaster contianer object
 */
export const useToaster = function(){
  return{
    general,
    form
  }
}
/**
 * Gets the default toaster for from notifications
 */
export const useFormToaster = () => form

/**
 * Gets the default toaster for general notifications
 * @returns {Object} The toaster contianer object
 */
export const useGeneralToaster = () => general
