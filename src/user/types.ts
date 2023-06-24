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

import { AxiosInstance, AxiosResponse } from "axios"
import { Ref } from "vue"
import { IUserConfig, WebMessage } from "../types"
import { ISessionUtil, ISession, ITokenResponse } from "../session/types"

export interface IUser {
    /**
     * A reactive ref to the username of the current user.
     * Its updated on calls to getProfile
     */
    readonly userName: Ref<string | null>
    /**
     * Prepares a login request for the server
     */
    prepareLogin(): IUserLoginRequest
    /**
     * Attempts to log the user out 
     */
    logout(): Promise<WebMessage>
    /**
     * Attempts to log the user in with a possible mfa upgrade result
     * @param userName The username to login with
     * @param password The password to login with
     * @returns A promise that resolves to the login result
     */
    login<T>(userName: string, password: string): Promise<ExtendedLoginResponse<T>>
    /**
     * Gets the user profile from the server
     */
    getProfile<T extends IUserProfile>(): Promise<T>
    /**
     * Resets the password for the current user
     * @param current the user's current password
     * @param newPass the user's new password
     * @param args any additional arguments to send to the server
     */
    resetPassword(current: string, newPass: string, args: object): Promise<WebMessage>
    /**
     * Sends a heartbeat to the server to keep the session alive
     * and regenerate credentials as designated by the server.
     */
    heartbeat(): Promise<AxiosResponse>
}

export interface IUserLoginRequest {
    /**
     * Finalizes a login process with the given response from the server
     * @param response The finalized login response from the server
     */
    finalize(response: ITokenResponse): Promise<void>
}

export interface IUserBackend {
    readonly config: IUserConfig;
    readonly userState: IUserState;
    readonly sessionUtil: ISessionUtil;
    readonly session: ISession;
    /**
     * Gets the axios instance for the user backend
     */
    getAxios(): AxiosInstance;
    /**
     * Gets the server endpoint for the given endpoint name
     */
    getEndpoint(endpoint: Endpoints): string;
    getPublcKey(): string | null;
    getBrowserId(): string | null;
}

export interface IUserState{
    readonly userName: Ref<string | null>
}

export interface ExtendedLoginResponse<T> extends WebMessage<T> {
    finalize: (response : ITokenResponse) => Promise<void>
}

export enum Endpoints {
    Login = "login",
    Logout = "logout",
    Register = "register",
    Reset = "reset",
    Profile = "profile",
    HeartBeat = "keepalive"
}

export interface IUserProfile {
    readonly email: string | undefined;
}