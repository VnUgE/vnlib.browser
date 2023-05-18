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

import { merge } from "lodash";
import { configureUserBackend, useUser as _useUser, IUserBackend } from "../user";
import { useSession, useSessionUtils, createReplaceableStorage } from "./session";
import { IUserConfig, ReactiveStorageLike } from '../types';
import { AxiosInstance } from 'axios';
import { useAxios } from './axios';
import { StorageLike, useIntervalFn } from "@vueuse/core";
import { MaybeRefOrGetter, Ref, isRef, ref, watch } from "vue";


/**
 * Represents an update to the live user config
 */
export interface IUserConfigUpdate {
    readonly storage?: StorageLike;
    readonly accountBasePath: string;
    readonly autoHearbeatInterval: number;
}

export interface UserConfig extends IUserConfig {
    updateConfig(config: IUserConfigUpdate): void;
    readonly autoHeartbeatInterval: Readonly<Ref<number>>;
}

const userConfig = (defaultConfig: IUserConfigUpdate): UserConfig => {

    const autoHeartbeatInterval = ref(defaultConfig.autoHearbeatInterval);

    //Setup the account base path
    let accountBasePath: string = defaultConfig.accountBasePath;

    //Setup storage backend
    const storage = createReplaceableStorage(defaultConfig.storage);

    const updateConfig = (config: IUserConfigUpdate): void => {
        storage.setStorage(config.storage);
        accountBasePath = config.accountBasePath;
        autoHeartbeatInterval.value = config.autoHearbeatInterval;
    }

    const getAccountBasePath = (): string => accountBasePath;

    const getStorage = (): ReactiveStorageLike => storage;

    //Get global axios instance
    const getAxios = (): AxiosInstance => useAxios(null);

    return{
        getAccountBasePath,
        getStorage,
        getAxios,
        updateConfig,
        autoHeartbeatInterval,
    }
}

/**
 * Get the default/fallback user configuration
 * @returns The default user configuration
 */
export const getDefaultUserConfig = (): IUserConfigUpdate => {
    return {
        accountBasePath: '/account',
        //Default to no persistant storage
        storage: undefined,
        //Default to disabled
        autoHearbeatInterval: 100000000000000
    }
};

const backend = (() => {
   let _backend;
   const initBackend = () => {
       //Configure user config from the default user config
       const defaultConfig = getDefaultUserConfig();
       const userConf = userConfig(defaultConfig);

       //Get the session and utils
       const session = useSession();
       const utils = useSessionUtils();

       return configureUserBackend(userConf, session, utils);
   } 
   return () : IUserBackend => _backend ??= initBackend();
})()


/**
 * Gets the global user interface
 * @returns The users api instance
 */
export const useUser = () => _useUser(backend());


export const updateUserConfig = (update : IUserConfigUpdate) =>{
    //Get default config
    const defaultConfig = getDefaultUserConfig();
    merge(defaultConfig, update);
    
    //Update the config
    (backend().config as UserConfig).updateConfig(defaultConfig);
}

export interface IAutoHeartbeatControls {
    /**
     * The current state of the heartbeat interval
     */
    enabled: Ref<boolean>;
    /**
     * Enables the hearbeat interval if configured
     */
    enable: () => void;
    /**
     * Disables the heartbeat interval
     */
    disable: () => void;
}

/**
 * Setup or control the automatic heartbeat interval
 * @returns Controls for the heartbeat interval
 */
export const useAutoHeartbeat = (() =>{

    //get live singleton of the user backend so we can read properties
    const _backend = backend();

    //Source of truth for the interval from config
    const { autoHeartbeatInterval } = (_backend.config as UserConfig);

    //Local copy of uesr instance
    const { heartbeat } = _useUser(_backend);

    //Setup the automatic heartbeat interval
    const { isActive, pause, resume } = useIntervalFn(() => _backend.session.loggedIn.value ? heartbeat() : null, autoHeartbeatInterval);

    //Pause until the manually enabled
    pause();

    /**
     * Configures shared controls for the heartbeat interval
     * @param enabled The a reactive value that may be used to enable/disable the heartbeat interval
     */
    return (enabled: MaybeRefOrGetter<boolean> | undefined = undefined): IAutoHeartbeatControls => {
        
        if(isRef(enabled)){
            if(enabled.value){
                //Resume the timer now 
                resume();
            }
            else{
                //Pause the timer now
                pause();
            }
            //Watch for changes to the enabled state
            watch(enabled, en => en ? resume() : pause());
        }
        else if(enabled === true){
            //Resume the timer now 
            resume();
        }

        return { enabled:isActive, enable:resume, disable:pause }
    }
})();