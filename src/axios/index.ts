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

import { isObjectLike, merge } from 'lodash'
import axios, { AxiosResponse } from 'axios';
import { IAxiosConfig } from './types';
import { ISession, ISessionUtil } from '../session';

export * from './types';

export interface IAxiosBackend {
    readonly config: IAxiosConfig;
    readonly session: ISession;
    readonly sessionUtils: ISessionUtil;
}


/**
 * Configures the global axios backend
 * @param fallbackConfig The default axios configuration to use when the user does not provide one to the useAxios function
 * @param session The global session object
 * @param utils The global session utils
 * @returns The global axios backend to pass to the useAxios function
 */
export const configureAxios = (fallbackConfig: IAxiosConfig, session : ISession, utils : ISessionUtil) : IAxiosBackend => {
    return AxiosBackend(fallbackConfig, session, utils);
}

/**
 * Gets a new axios instance with the global configuration, with interceptors to add required authorization
 * information to the request
 * @param {IAxiosBackend} backend The global axios backend
 * @param {any} userConfig An optional axios config object to override the default config
 * @returns A new axios instance
 */
export const useAxios = (backend: IAxiosBackend, config : object | null) => {
   
    //Get the default config from the backend
    const defaultConfig = backend.config.getDefaultConfig();
    
    //Merge the default config with the user config
    config = merge(defaultConfig, config);

    //Create the axios instance
    const axiosInstance = axios.create(config);
  
    //Add request interceptor to add the token to the request
    axiosInstance.interceptors.request.use(async (config) => {
        // See if the current session is logged in
        if (backend.session.loggedIn.value) {
            // Get an otp for the request
            config.headers[backend.config.getTokenHeader()] = await backend.sessionUtils.generateOneTimeToken()
        }
        // Return the config
        return config
    }, function (error) {
        // Do something with request error
        return Promise.reject(error)
    })

    //Add response interceptor to add a function to the response to get the result or throw an error to match the WebMessage server message
    axiosInstance.interceptors.response.use((response : AxiosResponse) => {
        
        //Add a function to the response to get the result or throw an error
        if(isObjectLike(response.data)){
            response.data.getResultOrThrow = () => {
                if (response.data.success) {
                    return response.data.result;
                } else {
                    //Throw in apicall format to catch in the catch block
                    throw { response };
                }
            }
        }
        return response;
    })

    return axiosInstance;
}


const AxiosBackend = (fallbackConfig: IAxiosConfig, session: ISession, utils: ISessionUtil) : IAxiosBackend =>{
    return {
        config: fallbackConfig,
        session: session,
        sessionUtils: utils
    }
} 