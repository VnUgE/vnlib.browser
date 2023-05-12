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

import { useSession } from "./session";
import { ILastPageStorage, usePageGuard as _pageGuard, useLastPage as _lastPage, ILastPage } from "../componentBase";

const storageKey = "lastPage";

//Storage impl
const lastPageStorage = () : ILastPageStorage =>{
    const storage = sessionStorage;

    const push = (route: string) => {
        //Serialize the route data and store it
        storage?.setItem(storageKey, route);
    }

    const pop = () :string | null => {
        //Get the route data and deserialize it
        const route = storage?.getItem(storageKey);
        if (route) {
            storage?.removeItem(storageKey);
            return route;
        }
        return null;
    }
    return{ push, pop }
}

/** 
 * When called, configures the component to 
 * only be visible when the user is logged in. If the user is 
 * not logged in, the user is redirected to the login page. 
 * @remarks Once called, if the user is logged-in changes will be
 * watch to redirect if the user becomes logged out.
*/
export const usePageGuard = (loginRoute = {name:'Login'}, lpStorage? : ILastPageStorage) => {
    //Get the session state
    const session = useSession(); 
    //Default to internal storage type
    const storage = lpStorage ?? lastPageStorage();
    //Configure the page guard
    _pageGuard(session, storage, loginRoute);
}

/**
 * Gets the configuration for the last page the user was on 
 * when the page guard was called. This is used to return to the
 * last page after login.
 * @returns { gotoLastPage: Function }
 */
export const useLastPage = (storage?: ILastPageStorage): ILastPage => {
    //Default storage to internal storage type
    storage ??= lastPageStorage();
    return _lastPage(storage);
}
