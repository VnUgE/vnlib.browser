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

//Export public session apis
import { updateSessionConfig, useSessionUtils, ISessionConfigUpdate } from './session'
export { ISessionConfigUpdate, useSession, useSessionUtils } from './session'

//Export public axios apis
import { AxiosConfigUpdate, updateAxiosConfig } from './axios'
export { useAxios, AxiosConfigUpdate } from './axios'

//Export public user apis
import { IUserConfigUpdate, updateUserConfig } from './user'
export { IUserConfigUpdate, useUser, useAutoHeartbeat } from './user'

//Export toast apis directly
export * from '../toast'

//Export api call
export * from './apiCall';

//Export only the public components
export {
    useConfirm,
    useEnvSize,
    useTitle,
    useWait,
    useScrollOnRouteChange
 } from '../componentBase';

//Export validation helpers
export * from './validation'

//Export message handler
export * from './message'

 //Export the server object buffer
export * from './serverObjectBuffer'

//Export lastpage/page guard
export * from './pageGuard'

//Export the all util
export * from '../util';

export interface IGlobalApiConfig{
    readonly session: ISessionConfigUpdate;
    readonly axios: AxiosConfigUpdate;
    readonly user: IUserConfigUpdate;
}

/**
 * Configures the global api settings for the entire library
 */
export const configureApi = (config: IGlobalApiConfig) => {
    
    //Applies the new session config to the live session config
    updateSessionConfig(config.session);

    //Applies the new axios config to the live axios config
    updateAxiosConfig(config.axios);

    //Applies the new user config to the live user config
    updateUserConfig(config.user);

    //Init the session api
    const session = useSessionUtils();
    session.checkAndSetCredentials();
}
