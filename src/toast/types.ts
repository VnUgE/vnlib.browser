
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

import { assign } from "lodash";
import { Ref } from "vue";

export interface IToaster{
    success(config : object) : void;
    error(config : object) : void;
    info(config : object) : void;
    close(id? : string) : void;
}

export interface INotifier{
    notify(config : object) : void;
    close(id : string) : void;
}

export interface IErrorNotifier {
    notifyError(title: string, message?: string): void;
    close(id? : string): void;
}

export interface ToasterNotifier extends IToaster, IErrorNotifier{
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const createToaster = (notifier: Ref<INotifier>, fallback: object): ToasterNotifier => {
    
    const success = (config: any): void => {
        config.type = 'success'
        assign(config, fallback)
        notifier.value.notify(config)
    }

  
    const error = (config: any): void => {
        config.type = 'error'
        assign(config, fallback)
        notifier.value.notify(config)
    }

    const info = (config: any): void => {
        config.type = 'info'
        assign(config, fallback)
        notifier.value.notify(config)
    }

    const close = (id: string): void => notifier.value.close(id);

    const notifyError = (title: string, message?: string): void => error({title, text: message});

    return {
        success,
        error,
        info,
        close,
        notifyError
    };
}