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

import { MfaMethod } from "./login"
import { WebMessage, useAxios } from "../config"
import { computed, Ref, ref } from "vue";
import { includes } from "lodash";

export interface MfaApi{
    /**
     * Reactive ref to the enabled mfa methods
     */
    readonly enabledMethods : Ref<MfaMethod[] | undefined>;
    
    /**
     * disables the given mfa method
     * @param type The mfa method to disable
     * @param password The user's password
     */
    disableMethod(type : MfaMethod, password: string) : Promise<WebMessage>;
    
    /**
     * Initializes or updates the given mfa method configuration
     * @param type The mfa method to initialize or update
     * @param password The user's password
     * @param userConfig Optional extended configuration for the mfa method. Gets passed to the server
     */
    initOrUpdateMethod<T>(type : MfaMethod, password: string, userConfig? : any) : Promise<WebMessage<T>>;

    /**
     * Refreshes the enabled mfa methods
     */
    refreshMethods() : Promise<void>;
}

/**
 * Gets the api for interacting with the the user's mfa configuration
 * @param mfaEndpoint The server mfa endpoint relative to the base url
 * @returns An object containing the mfa api
 */
export const useMfaConfig = (mfaEndpoint: string): MfaApi =>{

    const axios = useAxios(null);

    const enabledMethods = ref<MfaMethod[]>();

    const refreshMethods = async () => {
        //Get the mfa methods
        const result = await axios.get<MfaMethod[]>(mfaEndpoint);
        //Set the enabled methods
        enabledMethods.value = result.data
    }

    const disableMethod = async (type: MfaMethod, password: string) : Promise<WebMessage> => {
        //Disable the mfa using the post method
        const { data } = await axios.post<WebMessage>(mfaEndpoint, { type, password });
        return data;
    }

    const initOrUpdateMethod = async <T>(type: MfaMethod, password: string, userConfig?: any) : Promise<WebMessage<T>> => {
        //enable or update the mfa using the put method
        const { data } = await axios.put<WebMessage<T>>(mfaEndpoint, { type, password, ...userConfig });
        return data;
    }

    refreshMethods();

    return {
        enabledMethods,
        disableMethod,
        initOrUpdateMethod,
        refreshMethods
    }
}

export interface PkiApi{
    /**
     * Reactive ref that reflects whether the pki method is enabled
     */
    readonly enabled : Readonly<Ref<boolean>>;
    /**
     * Refreshes the enabled mfa methods
     */
    refresh() : Promise<void>;
    /**
     * Initializes or updates the pki method for the current user
     * @param publicKey The user's public key to initialize or update the pki method
     * @param options Optional extended configuration for the pki method. Gets passed to the server
     */
    initOrUpdate(publicKey: JsonWebKey, options? : any) : Promise<WebMessage>;
    /**
     * Disables the pki method for the current user and passes the given options to the server
     */
    disable(options? : any) : Promise<WebMessage>;
}

/**
 * Gets the api for interacting with the the user's pki configuration
 * @param pkiEndpoint The server pki endpoint relative to the base url
 * @param mfa The mfa api
 * @returns An object containing the pki api
 */
export const usePkiConfig = (pkiEndpoint: string, mfa: MfaApi): PkiApi => {
    const axios = useAxios(null);

    const enabled = computed<boolean>(() => includes(mfa.enabledMethods.value, "pki" as MfaMethod));

    const refresh = () =>  mfa.refreshMethods();

    const initOrUpdate = async (publicKey: JsonWebKey, options?: any) : Promise<WebMessage> => {
        const { data } = await axios.patch<WebMessage>(pkiEndpoint, { ...publicKey, ...options });
        return data;
    }

    const disable = async (options?: any) : Promise<WebMessage> => {
        const { data } = await axios.delete<WebMessage>(pkiEndpoint, options);
        return data;
    }

    return {
        enabled,
        refresh,
        initOrUpdate,
        disable
    }    
}