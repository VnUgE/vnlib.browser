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

import { Ref } from "vue";
import { ISessionConfig } from "../types";

export interface ITokenResponse{
    readonly token: Readonly<string>;
}

/**
 * Session utility interface, to interacte/manipulate the client/server session
 */
export interface ISessionUtil {

    /**
     * The internal session key store
     */
    readonly KeyStore: ISessionKeyStore;

    /**
     * updates the session credentials if they are not set
     */
    checkAndSetCredentials(): Promise<void>;

    /**
     * Updates session credentials from the server response
     * @param response The raw response from the server
     */
    updateCredentials(response: ITokenResponse): Promise<void>;

    /**
     * Computes a one time key for a fetch request security header
     * It is a signed jwt token that is valid for a short period of time
     */
    generateOneTimeToken(): Promise<string | null>;

    /**
     * Clears the session login status and removes all client side
     * session data
     */
    clearLoginState(): void;
}

export interface ISessionKeyStore {
    /**
     * The public key of the client
     */
    publicKey: Readonly<Ref<string | null>>;

    /**
     * Confirms that the credentials are set and if not, sets them
     */
    checkAndSetKeysAsync(): Promise<void>;

    /**
     * Regenerates the credentials and stores them in the key store
     */
    regenerateKeysAsync(): Promise<void>;

    /**
     * Decrypts the server encrypted that conforms to the vnlib protocol
     * @param data The data to encrypt, may be a string or an array buffer
     */
    decryptDataAsync(data: string | ArrayBuffer): Promise<ArrayBuffer>;
    
    /**
     * Decrypts and hashes the data that conforms to the vnlib protocol
     * @param data The data to decrypt and hash, may be a string or an array buffer
     */
    decryptAndHashAsync(data: string | ArrayBuffer): Promise<string>;

    /**
     * Clears all stored keys
     */
    clearKeys(): void;
}

export interface ISessionState {
    readonly browserId: Ref<string | null>;
    readonly token: Ref<string | null>;
    clearState(): void;
}


export interface ISessionBackend{
    readonly state : ISessionState;
    readonly util : ISessionUtil;
    readonly config: ISessionConfig;
    readonly keyStore : ISessionKeyStore;
}

/**
 * Represents the current server/client session state
 */
export interface ISession {
    /**
     * A readonly reactive reference to the login status
     * of the session.
     */
    readonly loggedIn: Readonly<Ref<boolean>>;
    
    /**
     * A readonly reactive reference indicating if the client 
     * is using a local account or a remote/oauth account
     */
    readonly isLocalAccount: Readonly<Ref<boolean>>;

    /**
     * A readonly reactive reference to the stored browser id
     */
    readonly browserId: Readonly<Ref<string | null>>;

    /**
     * A readonly reactive reference to the stored session public key
     */
    readonly publicKey: Readonly<Ref<string | null>>;
}

export interface ISessionCookieManager {
    readonly loginCookie: Readonly<Ref<number>>;
}
