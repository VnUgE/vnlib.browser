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

import { isNil } from 'lodash'
import { ArrayBuffToBase64, Base64ToUint8Array } from '../binhelpers'
import { getRandomHex } from '../webcrypto'
import { SignJWT } from 'jose'
import { debugLog } from '../util'

import { ISessionState, ISessionKeyStore, ISessionUtil, ITokenResponse } from './types'
import { ISessionConfig } from '../types'

export const createUtil = (config: ISessionConfig, state: ISessionState, KeyStore: ISessionKeyStore): ISessionUtil => {
    
    const checkAndSetCredentials = async (): Promise<void> => {
        KeyStore.checkAndSetKeysAsync();
        // Check browser id
        if (isNil(state.browserId.value)) {
            const bidSize = config.getBrowserIdSize();

            // generate a new random value and store it
            state.browserId.value = getRandomHex(bidSize);

            debugLog("Generated new browser id, none was found")
        }
    }

    const updateCredentials = async (response: ITokenResponse): Promise<void> => {
        /*
        * The server sends an encrypted HMAC key 
        * using our public key. We need to decrypt it 
        * and use it to sign messages to the server.
        */
        const decrypted = await KeyStore.decryptDataAsync(response.token)
        
        // Convert the hash to a base64 string and store it
        state.token.value = ArrayBuffToBase64(decrypted)
    }

    const generateOneTimeToken = async (): Promise<string | null> => {
        //we need to get the shared key from storage and decode it, it may be null if not set
        const sharedKey = state.token.value ? Base64ToUint8Array(state.token.value) : null

        if (!sharedKey) {
            return null;
        }

        //Inint jwt with a random nonce
        const nonce = getRandomHex(16);

        //Get the alg from the config
        const alg = config.getSignatureAlgorithm();

        const jwt = new SignJWT({ 'nonce': nonce })
        //Set alg
        jwt.setProtectedHeader({ alg })
            //Iat is the only required claim at the current time utc
            .setIssuedAt()

        //Sign the jwt
        const signedJWT = await jwt.sign(sharedKey)

        return signedJWT;
    }

    const clearLoginState = (): void => {
        state.clearState();
        KeyStore.clearKeys();
    }

    return { KeyStore, checkAndSetCredentials, updateCredentials, generateOneTimeToken, clearLoginState };
}