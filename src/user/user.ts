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

import { isNil, toInteger, defaultTo } from 'lodash'
import { AxiosResponse } from "axios"
import { computed, watch } from "vue"
import { IUser, IUserLoginRequest, IUserBackend, Endpoints } from './types'
import { decodeJwt } from 'jose'
import { debugLog } from '../util'

export const createUser = (backend: IUserBackend) : IUser => {

    //Ref to the user state username property
    const userName = computed(() => backend.userState.userName.value);

    const prepareLogin = () => createLoginMessage(backend);

    //We want to watch the loggin ref and if it changes to false, clear the username
    watch(backend.session.loggedIn, value => value === false ? backend.userState.userName.value = null : null)

    const processMfa = (mfaMessage: string, loginMessage: IUserLoginRequest) => {
        //Mfa message is a jwt, decode it (unsecure decode)
        const mfa = decodeJwt(mfaMessage)

        debugLog(mfa)

        switch (mfa.type) {
            case 'totp':
                {
                    const { type, expires } = mfa;

                    const Submit = async (code: string): Promise<AxiosResponse> => {
                        const { post } = backend.getAxios();
                        //Totp endpoint submission
                        const ep = backend.getEndpoint(Endpoints.MfaTotp);

                        // Submit totp request to the server
                        const response = await post(ep, {
                            //Pass raw upgrade message back to server as its signed
                            upgrade: mfaMessage,
                            //totp code as an integer type
                            code: toInteger(code),
                            //Local time as an ISO string of the current time
                            localtime: new Date().toISOString()
                        })

                        // If the server returned a token, complete the login
                        if (response.data.success && !isNil(response.data.token)) {
                            await loginMessage.finalize(response)
                        }

                        return response
                    }
                    return { type, expires, Submit }
                }
            default:
                throw { message: 'Server responded with an unsupported two factor auth type, login cannot continue.' }
        }
    }

    const logout = async (): Promise <AxiosResponse> => {
        //Get axios with logout endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Logout);

        // Send a post to the accoutn login endpoint to logout
        const result = await post(ep, {});

        //regen session credentials
        await backend.sessionUtil.KeyStore.regenerateKeysAsync()

        // return the response
        return result
    }

    const login = async (userName: string, password: string): Promise <AxiosResponse> => {
        //Get axios and the login endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Login);

        const prepped = prepareLogin();

        //Set the username and password
        prepped.username = userName;
        prepped.password = password;

        //Send the login request
        const response = await post(ep, prepped);

        // Check the response
        if(response.status === 200 && response.data.success === true) {

            // If the server returned a token, complete the login
            if (!isNil(response.data.token)) {
                await prepped.finalize(response)
            }
            // Check for a two factor auth mesage
            else if (response.data.mfa === true) {
                // Process the two factor auth message and add it to the response
                const mfa = { mfa: processMfa(response.data.result, prepped) }
                Object.assign(response, mfa)
                return response
            }
        }
        return response;
    }

    const getProfile = async (): Promise <any> => {
        //Get axios and the profile endpoint
        const { get } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Profile);

        // Get the user's profile from the profile endpoint
        const response = await get(ep);

        //Update the internal username if it was set by the server
        const newUsername = defaultTo(response.data.email, userName.value);

        //Update the user state with the new username from the server
        backend.userState.userName.value = newUsername;

        // return response data
        return response.data
    }

    const resetPassword = (current: string, newPass: string, args: object): Promise <AxiosResponse> => {
        //Get axios and the reset password endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.Reset);

        // Send a post to the reset password endpoint
        return post(ep, {
            current,
            new_password: newPass,
            ...args
        })
    }

    const heartbeat = async (): Promise <AxiosResponse> => {
        //Get axios and the heartbeat endpoint
        const { post } = backend.getAxios();
        const ep = backend.getEndpoint(Endpoints.HeartBeat);

        // Send a post to the heartbeat endpoint
        const response = await post(ep);
        
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
        heartbeat
    }
}

const createLoginMessage = (backend: IUserBackend) => {
    //Store a copy of the session data and the current time for the login request
    const localtime = new Date().toISOString();
    const locallanguage = navigator.language;
    const pubkey = backend.getPublcKey();
    const clientid = backend.getBrowserId();

    const finalize = async (response: AxiosResponse): Promise<void> => {
        //Update the session with the new credentials
        await backend.sessionUtil.updateCredentials(response.data);

        //Update the user state with the new username
        backend.userState.userName.value = response.data.email;
    }
    return{
        localtime,
        locallanguage,
        pubkey,
        clientid,
        username: '',
        password: '',
        finalize
    }
}