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

import { ISessionState } from "./types";
import { computed } from "vue";
import { ISessionConfig } from "../types";
import { useStorage } from "@vueuse/core";

const storageKey = "_vn-session";

interface IStateStorage {
    token: string | null;
    bid: string | null;
}

export const createState = (config: ISessionConfig) : ISessionState =>{

    //get dynamic storage backend
    const storageBackend = config.getStorage();

    //Setup vuesuse storage around the backend
    const storage = useStorage <IStateStorage>(storageKey, { token: null, bid: null }, storageBackend)

    //Reactive properties
    const token = computed({
        get: () => storage.value.token,
        set: (value) => storage.value.token = value
    });

    const browserId = computed({
        get: () => storage.value.bid,
        set: (value) => storage.value.bid = value
    });

    const clearState = (): void =>{
        storage.value = { token: null, bid: null };
    };

    return { token, browserId, clearState }
}

