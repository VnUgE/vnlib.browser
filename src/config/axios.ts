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

import { merge } from 'lodash'
import { ref } from "vue";
import { IAxiosConfig, configureAxios, useAxios as _useAxios, IAxiosBackend } from "../axios";
import { useSession, useSessionUtils } from './session'


export interface AxiosConfigUpdate extends Object {
    tokenHeader?: string;
}

interface AxiosConfig extends IAxiosConfig {
    updateConfig(update: AxiosConfigUpdate): void;
}


/**
 * Gets the default/fallback axios configuration
 * @returns The default axios configuration
 */
export const getDefaultAxiosConfig = (): AxiosConfigUpdate | object => {
    return {
        baseURL: '/',
        timeout: 60 * 1000,
        withCredentials: false,
        tokenHeader: 'X-Web-Token'
    }
}

const backend = (() => {
    let _backend;

    const initConfig = () => {
        //Get the session and utils
        const session = useSession();
        const utils = useSessionUtils();
        const defConfig = getDefaultAxiosConfig();

        //Create the config instance
        const config = axiosConfig(defConfig);
        return configureAxios(config, session, utils);
    }
    return (): IAxiosBackend => _backend ??= initConfig();
})()

//Config impl
const axiosConfig = (defaultConfig: AxiosConfigUpdate): AxiosConfig =>{
    const conf = ref<AxiosConfigUpdate>(defaultConfig);

    const getDefaultConfig = () => conf.value;

    const getTokenHeader = () => conf.value.tokenHeader ?? "X-Web-Token";

    const updateConfig = (config: AxiosConfigUpdate) =>{
        merge(conf.value, config);
    }

    return { getDefaultConfig, getTokenHeader, updateConfig};
}

/**
 * Get the axios instance and optionally apply a config
 * @param config Optional Axios instance configuration to apply, will be merged with the default config
 * @returns The axios instance
 */
export const useAxios = (config: object | null) => _useAxios(backend(), config); 

/**
 * Updates the global axios default config
 * @param config The new config to read values from
 */
export const updateAxiosConfig = (config: AxiosConfigUpdate) => {
    //Merge with default config
    const defaultConfig = getDefaultAxiosConfig();

    merge(defaultConfig, config);

    //Update the backend config
    (backend().config as AxiosConfig).updateConfig(defaultConfig);
}