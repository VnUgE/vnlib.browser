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


import axios from 'axios'
import { ref, watch } from 'vue'
import { useSession, useSessionUtils } from './session'
import { useIntervalFn } from '@vueuse/core'

export const useAxios = (function () {
    //Get session to access the token and logged in status
    const { loggedIn } = useSession()
    const { generateOneTimeKey } = useSessionUtils()

    const tokenCache = new ref(null)

    //Regen an otp every 5 seconds, it may be null if no token is set
    useIntervalFn(async () => tokenCache.value = await generateOneTimeKey(), 2000)

    //If the user logs in, generate a new token immediately
    watch(loggedIn, async (value) =>{
        if(value) {
            tokenCache.value = await generateOneTimeKey()
        }
    })

    //Init axios config
    const config = {
        baseURL: import.meta.env.VITE_API_URL || '/',
        timeout: 60 * 1000, // Timeout
        withCredentials: import.meta.env.VITE_CORS_ENABLED == 'true' // Check cross-site Access-Control
    }

    const _axios = axios.create(config)

    //Add request interceptor to add the token to the request
    _axios.interceptors.request.use(function (config) {
        // See if the current session is logged in
        if (loggedIn.value) {
            // Get an otp for the request
            config.headers[import.meta.env.VITE_WEB_TOKEN_HEADER || "X-Web-Token"] = tokenCache.value
        }
        // Return the config
        return config
    }, function (error) {
        // Do something with request error
        return Promise.reject(error)
    })
    //Return the axios instance as a function
    return () => _axios
})()