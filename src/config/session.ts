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

import { ref } from "vue";
import { forEach, merge } from "lodash";
import { ISessionConfig, ReactiveStorageLike } from "../types";
import { ISessionBackend, ISessionUtil, ISession, createSessionBackend, useSession as _useSession } from "../session";
import { StorageLike } from "@vueuse/core";

export interface ISessionConfigUpdate {
    readonly bidSize: number;
    readonly sigAlg: string;
    readonly keyAlg: object;
    readonly storage?: StorageLike;
    readonly cookiesEnabled: boolean;
    readonly loginCookieName: string;
}

export interface ReplaceableStorage extends ReactiveStorageLike {
    setStorage(st?: StorageLike): void;
}

interface SessionConfig extends ISessionConfig{
    updateConfig(config: ISessionConfigUpdate): void;
}

const createConfig = (defaultConfig: ISessionConfigUpdate): SessionConfig => {
    const storage = createReplaceableStorage(defaultConfig.storage);

    let bidSize = defaultConfig.bidSize;
    let sigAlg = defaultConfig.sigAlg;
    let keyAlg = defaultConfig.keyAlg;
    let cookieName = defaultConfig.loginCookieName;

    //Setup interface implementation
    const cookiesEnabled = ref(defaultConfig.cookiesEnabled);

    const getLoginCookieName = () : string => cookieName;

    const getBrowserIdSize = (): number => bidSize;

    const getSignatureAlgorithm = (): string => sigAlg;

    const getKeyAlgorithm = (): object => keyAlg;

    const getStorage = (): ReactiveStorageLike => storage;

    const updateConfig = (config: ISessionConfigUpdate) => {
        bidSize = config.bidSize;
        sigAlg = config.sigAlg;
        keyAlg = config.keyAlg;
        cookieName = config.loginCookieName;

        cookiesEnabled.value = config.cookiesEnabled;

        storage.setStorage(config.storage);
    }

    return {
        cookiesEnabled,
        getLoginCookieName,
        getBrowserIdSize,
        getSignatureAlgorithm,
        getKeyAlgorithm,
        getStorage,
        updateConfig
    }
}

export const createReplaceableStorage = (storage?: StorageLike): ReplaceableStorage => {

    const onUpdate: Array<() => void> = [];

    const getItem = (key: string): string | null => {
        //If the storage is null, return null
        return storage?.getItem(key) ?? null;
    }
    const setItem = (key: string, value: string): void => {
        //If the storage is null, do nothing
        storage?.setItem(key, value);
    }

    const removeItem = (key: string): void => {
        //If the storage is null, do nothing
        storage?.removeItem(key);
    }

    const setStorage = (st?: StorageLike) => {
        storage = st;
        //invoke update event when set
        forEach(onUpdate, cb => cb());
    }

    const onStorageChanged = (key: string, callback: () => void) => {
        //Listen for storage changes on the window and invoke the callback for all changes
        window?.addEventListener('storage', ev => ev.key === key ? callback() : null);

        //Store the callback
        onUpdate.push(callback);

        //intial update
        callback();
    }

    return{
        getItem,
        setItem,
        removeItem,
        setStorage,
        onStorageChanged
    }
}

/**
 * Gets the default/fallback session configuration
 * @returns The default session configuration
 */
const getDefaultSessionConfig = (): ISessionConfigUpdate => {
    return {
        bidSize: 32,
        sigAlg: 'HS256',

        cookiesEnabled: navigator?.cookieEnabled === true,
        loginCookieName: 'li',

        //Default to disable persistant storage
        storage: undefined,

        keyAlg: {
            name: 'RSA-OAEP',
            modulusLength: 4096,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' },
        },
    }
}

/* THE STATIC BACKEND */
const backend = (() =>{
    let _backend : ISessionBackend | undefined;
    const initBackend = () => {
        //Get the default config
        const fallback = getDefaultSessionConfig();

        //Create the session config
        const sessionConfig = createConfig(fallback);

        return createSessionBackend(sessionConfig);
    }
    return () : ISessionBackend =>{
        //If the backend is null, create it
        return _backend ?? ( _backend = initBackend());
    }
})()


/**
 * Gets the global session api instance
 * @returns The session api instance
 */
export const useSession = (): ISession => _useSession(backend());

/**
 * Gets the session utils api instance
 * @returns The session utils
 */
export const useSessionUtils = (): ISessionUtil => backend().util;

/**
 * Updates the global session config
 * @param config the new config to read values from
 */
export const updateSessionConfig = (config: ISessionConfigUpdate) => {
    //Merge with default
    const defaultConfig = getDefaultSessionConfig();
    merge(defaultConfig, config);

    //Apply config
    (backend().config as SessionConfig).updateConfig(defaultConfig);
}

