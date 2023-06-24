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

import { isNil, defaultTo } from 'lodash'
import { AxiosResponse } from "axios"
import { computed, watch } from "vue"
import { IUser, IUserBackend, Endpoints, IUserProfile, ExtendedLoginResponse } from './types'
import { ITokenResponse } from '../session'
import { WebMessage } from '../types'

export interface IUserInternal extends IUser {
    readonly backend: IUserBackend
}

export const createUser = (backend: IUserBackend): IUserInternal => {

    //Ref to the user state username property
    const userName = computed(() => backend.userState.userName.value);

    const prepareLogin = () => {
        //Store a copy of the session data and the current time for the login request
        const finalize = async (response: ITokenResponse): Promise<void> => {
            //Update the session with the new credentials
            await backend.sessionUtil.updateCredentials(response);

            //Update the user state with the new username
            backend.userState.userName.value = (response as { email? : string }).email || null;
        }
        return {
            localtime: new Date().toISOString(),
            locallanguage: navigator.language,
            pubkey: backend.getPublcKey(),
            clientid: backend.getBrowserId(),
            username: '',
            password: '',
            finalize
        }
    }

    //We want to watch the loggin ref and if it changes to false, clear the username
    watch(backend.session.loggedIn, value => value === false ? backend.userState.userName.value = null : null)

    const logout = async (): Promise<WebMessage> => {
        //Get axios with logout endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Logout);

        // Send a post to the accoutn login endpoint to logout
        const { data } = await post<WebMessage>(ep, {});

        //regen session credentials on successful logout
        await backend.sessionUtil.KeyStore.regenerateKeysAsync()

        // return the response
        return data
    }

    const login = async <T>(userName: string, password: string): Promise<ExtendedLoginResponse<T>> => {
        //Get axios and the login endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Login);

        const prepped = prepareLogin();

        //Set the username and password
        prepped.username = userName;
        prepped.password = password;

        //Send the login request
        const { data } = await post<ITokenResponse>(ep, prepped);

        // Check the response
        if(data.success === true) {

            // If the server returned a token, complete the login
            if (!isNil(data.token)) {
                await prepped.finalize(data)
            }
        }

        return {
            ...data,
            finalize: prepped.finalize
        }
    }

    const getProfile = async <T extends IUserProfile>(): Promise <T> => {
        //Get axios and the profile endpoint
        const { get } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Profile);

        // Get the user's profile from the profile endpoint
        const response = await get<T>(ep);

        //Update the internal username if it was set by the server
        const newUsername = defaultTo(response.data.email, userName.value);

        //Update the user state with the new username from the server
        backend.userState.userName.value = newUsername;

        // return response data
        return response.data
    }

    const resetPassword = async (current: string, newPass: string, args: object): Promise<WebMessage> => {
        //Get axios and the reset password endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Reset);

        // Send a post to the reset password endpoint
        const { data } = await post<WebMessage>(ep, {
            current,
            new_password: newPass,
            ...args
        })

        return data
    }

    const heartbeat = async (): Promise <AxiosResponse> => {
        //Get axios and the heartbeat endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.HeartBeat);

        // Send a post to the heartbeat endpoint
        const response = await post<ITokenResponse>(ep);
        
        //If success flag is set, update the credentials
        if(response.data.success){
            //Update credential
            await backend.sessionUtil.updateCredentials(response.data);
        }
        return response;
    }

    return{
        userName,
        prepareLogin,
        logout,
        login,
        getProfile,
        resetPassword,
        heartbeat,
        backend
    }
}
