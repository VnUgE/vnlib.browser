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

import { ISession, ISessionUtil } from "../session/types";
import { IUserConfig } from "../types";
import { createUserState } from "./userState";
import { Endpoints, IUserBackend } from "./types";

export const createUserBackend = (config : IUserConfig, session : ISession, sessionUtil : ISessionUtil) : IUserBackend => {
    const userState = createUserState(config);
    
    const getAxios = config.getAxios;

    const getEndpoint = (endpoint: Endpoints) => {
        const base = config.getAccountBasePath();
        return `${base}/${endpoint}`;
    }

    const getPublcKey = () => session.publicKey.value;

    const getBrowserId = () => session.browserId.value;

    return { 
        config,
        session,
        userState,
        sessionUtil,
        getAxios,
        getEndpoint,
        getPublcKey,
        getBrowserId
    };
}
