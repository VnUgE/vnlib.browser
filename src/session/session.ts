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

import { isEmpty } from 'lodash';
import { computed, watch } from "vue";
import { ISession, ISessionBackend } from "./types";
import { LoginCookieManager } from "./cookies";

export const createSession = (backend : ISessionBackend) : ISession =>{

    //Setup the login cookie
    const liCookie = LoginCookieManager(backend.config);

    //Setup the login ref
    const loggedIn = computed(() => {
        const tokenVal = !isEmpty(backend.state.token.value)
        //If cookies are disabled, only allow the user to be logged in if the token is set
        if(backend.config.cookiesEnabled.value){
            return liCookie.loginCookie.value > 0 && tokenVal
        }
        return tokenVal
    })

    //Local account
    const isLocalAccount = computed(() => liCookie.loginCookie.value === 1);

    //Browser id
    const browserId = computed(() => backend.state.browserId.value);

    //Public key
    const publicKey = computed(() => backend.keyStore.publicKey.value);

    //Watch the logged in value and if it changes from true to false, clear the token
    watch(loggedIn, value => value ? null : backend.state.token.value = null);

    return { loggedIn, isLocalAccount, browserId, publicKey }
}