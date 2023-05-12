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
import { IUserConfig } from "../types"
import { ISessionUtil, ISession } from "../session/types"

export interface IUser {
    readonly userName: Ref<string | null>

    prepareLogin(): IUserLoginRequest
    logout(): Promise<AxiosResponse>
    login(userName: string, password: string): Promise<AxiosResponse>
    getProfile(): Promise<any>
    resetPassword(current: string, newPass: string, args: object): Promise<AxiosResponse>
    /**
     * Sends a heartbeat to the server to keep the session alive
     * and regenerate credentials as designated by the server.
     */
    heartbeat(): Promise<AxiosResponse>
}

export interface IUserLoginRequest {
    finalize(response: AxiosResponse): Promise<void>
}

export interface IUserBackend {
    readonly config: IUserConfig;
    readonly userState: IUserState;
    readonly sessionUtil: ISessionUtil;
    readonly session: ISession;
    getAxios(): AxiosInstance;
    getEndpoint(endpoint: Endpoints): string;
    getPublcKey(): string | null;
    getBrowserId(): string | null;
}

export interface IUserState{
    readonly userName: Ref<string | null>
}

export enum Endpoints {
    Login = "login",
    Logout = "logout",
    Register = "register",
    Reset = "reset",
    Profile = "profile",
    HeartBeat = "keepalive",
    MfaTotp = "login?mfa=totp"
}
