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

import { defaultTo, isArray, isNil } from "lodash";
import { IErrorNotifier } from "../toast";
import { useWait } from "./wait";

export interface IApiHandle<T> {
    /**
     * Called to get the object to pass to apiCall is invoked
     */
    getCallbackObject(): T;

    /**
     * Called to get the notifier to use for the api call
     */
    getNotifier(): IErrorNotifier;
}

export const useApiCall = <T>(args: IApiHandle<T>) =>{
    const { setWaiting } = useWait();
    
    /**
     * Provides a wrapper method for making remote api calls to a server
     * while capturing context and errors and common api arguments.
     * @param {*} callback The method to call within api request context
     * @returns A promise that resolves to the result of the async function
     */
    return async <TR>(callback: (data: T) => Promise<TR | undefined>): Promise<TR | undefined> =>{
        const notifier = args.getNotifier();

        // Set the waiting flag
        setWaiting(true);

        try {
            //Close the current toast value
            notifier.close();

            const obj = args.getCallbackObject();

            //Exec the async function
            return await callback(obj);

        } catch (errMsg : any) {
            console.error(errMsg)
            // See if the error has an axios response
            if (isNil(errMsg.response)) {
                if (errMsg.message === 'Network Error') {
                    notifier.notifyError('Please check your internet connection')
                } else {
                    notifier.notifyError('An unknown error occured')
                }
                return
            }
            // Axios error message
            const response = errMsg.response
            const errors = response?.data?.errors
            const hasErrors = isArray(errors) && errors.length > 0

            const SetMessageWithDefault = (message : string) => {
                if (hasErrors) {
                    const title = 'Please verify your ' + defaultTo(errors[0].property, 'form')
                    notifier.notifyError(title, errors[0].message)
                } else {
                    notifier.notifyError(defaultTo(response?.data?.result, message))
                }
            }

            switch (response.status) {
                case 200:
                    SetMessageWithDefault('')
                    break
                case 400:
                    SetMessageWithDefault('Bad Request')
                    break
                case 422:
                    SetMessageWithDefault('The server did not accept the request')
                    break
                case 401:
                    SetMessageWithDefault('You are not logged in.')
                    break
                case 403:
                    SetMessageWithDefault('Please clear you cookies/cache and try again')
                    break
                case 404:
                    SetMessageWithDefault('The requested resource was not found')
                    break
                case 409:
                    SetMessageWithDefault('Please clear you cookies/cache and try again')
                    break
                case 410:
                    SetMessageWithDefault('The requested resource has expired')
                    break
                case 423:
                    SetMessageWithDefault('The requested resource is locked')
                    break
                case 429:
                    SetMessageWithDefault('You have made too many requests, please try again later')
                    break
                case 500:
                    SetMessageWithDefault('There was an error processing your request')
                    break
                default:
                    SetMessageWithDefault('An unknown error occured')
                    break
            }
        } finally {
            // Clear the waiting flag
            setWaiting(false);
        }
    }
}