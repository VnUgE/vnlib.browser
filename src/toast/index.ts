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

import { Ref, ref } from 'vue'
import { createFormToaster } from './formToast'
import { createGeneralToaster } from './generalToast'
import { INotifier, IToaster, ToasterNotifier } from './types'
export { INotifier, IErrorNotifier, createToaster as Toaster, IToaster } from './types'

export interface CombinedToaster {
    readonly form: IToaster;
    readonly general: IToaster;
}

class DefaultNotifier implements INotifier {
    notify(config: any): void {
        console.log(`Notification: ${config.title} - ${config.text}`)
    }
    close(id: string): void {
        console.log(`Notification closed: ${id}`)
    }
}

//Combined toaster impl
const createCombinedToaster = (handler: Ref<INotifier>) : CombinedToaster => {
    const form = createFormToaster(handler);
    const general = createGeneralToaster(handler);
    
    const close = (id?: string) => {
        form.close(id);
        general.close(id);
    }

    return Object.freeze({ form, general, close });
}


// The program handler for the notification
const _handler = ref<INotifier>(new DefaultNotifier())

/**
 * Configures the notification handler. 
 * @param {*} notifier The method to call when a notification is to be displayed
 * @returns The notifier
 */
export const configureNotifier = (notifier : INotifier) => _handler.value = notifier

/**
 * Gets the default toaster for general notifications
 * and the form toaster for form notifications
 * @returns {Object} The toaster contianer object
 */
export const useToaster = (): CombinedToaster => createCombinedToaster(_handler);

/**
 * Gets the default toaster for from notifications
 */
export const useFormToaster = (): ToasterNotifier => createFormToaster(_handler);

/**
 * Gets the default toaster for general notifications
 * @returns {Object} The toaster contianer object
 */
export const useGeneralToaster = (): ToasterNotifier => createGeneralToaster(_handler);