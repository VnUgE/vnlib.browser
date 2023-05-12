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

import { isEqual, isNil } from 'lodash';
import { AxiosError, AxiosInstance } from 'axios';
import { useConfirmDialog } from '@vueuse/core';
import { useApiCall, IApiHandle } from '../componentBase'
import { useFormToaster, CombinedToaster, useToaster } from '../toast';
import { useAxios } from './axios';
import { IErrorNotifier } from '../toast';

interface IApiPassThrough {
    readonly axios: AxiosInstance;
    readonly toaster: CombinedToaster;
}

export interface IElevatedCallPassThrough extends IApiPassThrough {
    readonly password: string;
}


const apiHandle = (): IApiHandle<IApiPassThrough> =>{
    let axios : AxiosInstance | undefined;
    let toaster : CombinedToaster | undefined;
    let notifier : IErrorNotifier | undefined;

    const getCallbackObject = (): IApiPassThrough => {
        
        //Init the axios instance if it is not already initialized
        axios ??= useAxios(null);

        //Require global toaster to pass to the caller, cache it if it is not already cached
        toaster ??= useToaster();

        return { axios, toaster }
    }

    const getNotifier = (): IErrorNotifier => {
        return notifier ?? (notifier = useFormToaster());
    }

    return { getCallbackObject, getNotifier }
}

const customApiHandle = (msg: (message: string) => void): IApiHandle<IApiPassThrough> => {
    let axios: AxiosInstance | undefined;
    let toaster: CombinedToaster | undefined;

    const getCallbackObject = (): IApiPassThrough => {

        //Init the axios instance if it is not already initialized
        axios ??= useAxios(null);

        //Require global toaster to pass to the caller, cache it if it is not already cached
        toaster ??= useToaster();

        return { axios, toaster }
    }

    const getNotifier = (): IErrorNotifier => {
        return {
            notifyError: (t: string, m?: string) => {
                msg(t);
                return m;
            },
            close(id: string) {
                msg('')
                return id;
            },
        }
    }

    return { getCallbackObject, getNotifier }
}

/**
 * Provides a wrapper method for making remote api calls to a server
 * while capturing context and errors and common api arguments.
 * @param {*} asyncFunc The method to call within api request context
 * @returns A promise that resolves to the result of the async function
 */
export const apiCall = (() =>{
    //Confiugre the api call to use global configuration
    return useApiCall(apiHandle());
})();

/**
 * Customizes the api call to use a custom error message
 * @param msg The message to display when an error occurs
 * @returns {Object} The api call object {apiCall: Promise }
 */
export const configureApiCall = (msg: (message : string) => void): object =>{
    //Confiugre the api call to use global configuration
    const apiCall = useApiCall(customApiHandle(msg));
    return { apiCall }
}

/**
 * Gets the shared password prompt object and the elevated api call method handler 
 * to allow for elevated api calls that require a password.
 * @returns {Object} The password prompt configuration object, and the elevated api call method
 */
export const usePassConfirm = (() => {

    //Shared confirm object
    const confirm = useConfirmDialog();

    /**
     * Displays the password prompt and executes the api call with the password
     * captured from the prompt. If the api call returns a 401 error, the password
     * prompt is re-displayed and the server error message is displayed in the form
     * error toaster.
     * @param callback The async callback method that invokes the elevated api call.
     * @returns A promise that resolves to the result of the async function
     */
    const elevatedApiCall = <T>(callback: (api: IElevatedCallPassThrough) => Promise<T>): Promise<T | undefined> => {
        //Invoke api call method but handle 401 errors by re-displaying the password prompt
        return apiCall<T>(async (api: IApiPassThrough) : Promise<T | undefined> => {
            // eslint-disable-next-line no-constant-condition
            while (1) {

                //Display the password prompt
                const { data, isCanceled } = await confirm.reveal()
                
                if (isCanceled) {
                    break;
                }

                try {
                    //Execute the api call with prompt response
                    return await callback({...api, ...data });
                }
                //Catch 401 errors and re-display the password prompt, otherwise throw the error
                catch (err) {
                    if(!(err instanceof AxiosError)){
                       throw err;
                    }

                    const { response } = err;

                    if(isNil(response)){
                        throw err;
                    }

                    //Check status code, if 401, re-display the password prompt
                    if (!isEqual(response?.status, 401)) {
                        throw err;
                    } 

                    //Display the error message
                    api.toaster.form.error({ title: response.data.result });

                    //Re-display the password prompt
                }
            }
        })
    }

    //Pass through confirm object and elevated api call
    return () => {
        return { ...confirm, elevatedApiCall }
    }

})();