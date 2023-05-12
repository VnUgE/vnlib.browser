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

import { isArrayBuffer, isPlainObject, isString } from 'lodash';
import { ArrayBuffToBase64, Base64ToUint8Array, ArrayToHexString } from './binhelpers';

const crypto = window?.crypto?.subtle || {};

/**
 * Signs the dataBuffer using the specified key and hmac algorithm by its name eg. 'SHA-256'
 * @param {ArrayBuffer | String} dataBuffer The data to sign, either as an ArrayBuffer or a base64 string
 * @param {ArrayBuffer | String} keyBuffer The raw key buffer, or a base64 encoded string
 * @param {String} alg The name of the hmac algorithm to use eg. 'SHA-256'
 * @param {String} [toBase64 = false] The output format, the array buffer data, or true for base64 string
 * @returns {Promise<ArrayBuffer | String>} The signature as an ArrayBuffer or a base64 string
 */
export const hmacSignAsync = async (keyBuffer: ArrayBuffer | string, dataBuffer: ArrayBuffer | string, alg : string, toBase64 = false) 
: Promise<ArrayBuffer | string> => {
     // Check key argument type
    const rawKeyBuffer = isString(keyBuffer) ? Base64ToUint8Array(keyBuffer as string) : keyBuffer as ArrayBuffer;
    
    // Check data argument type
    const rawDataBuffer = isString(dataBuffer) ? Base64ToUint8Array(dataBuffer as string) : dataBuffer as ArrayBuffer;
   
    // Get the key
    const hmacKey = await crypto.importKey('raw', rawKeyBuffer, { name: 'HMAC', hash: alg }, false, ['sign']);

    // Sign hmac data
    const digest = await crypto.sign('HMAC', hmacKey, rawDataBuffer);

    // Encode to base64 if needed
    return toBase64 ? ArrayBuffToBase64(digest) : digest;
}
/**
 * @function decryptAsync Decrypts syncrhonous or asyncrhonsous en encypted data
 * asynchronously.
 * @param {any} data The encrypted data to decrypt. (base64 string or ArrayBuffer)
 * @param {any} privKey The key to use for decryption (base64 String or ArrayBuffer).
 * @param {Object} algorithm The algorithm object to use for decryption.
 * @param {Boolean} toBase64 If true, the decrypted data will be returned as a base64 string.
 * @returns {Promise} The decrypted data.
 */
export const decryptAsync = async (
    algorithm: AlgorithmIdentifier,
    privKey: BufferSource | CryptoKey | JsonWebKey,
    data: string | ArrayBuffer,
    toBase64 = false): Promise<string | ArrayBuffer> =>
{
    // Check data argument type and decode if needed
    const dataBuffer = isString(data) ? Base64ToUint8Array(data as string) : data as ArrayBuffer;

    let privateKey = privKey
    // Check key argument type
    if (privKey instanceof CryptoKey) {
        privateKey = privKey
    }
    // If key is binary data, then import it as raw data
    else if (isArrayBuffer(privKey)) {
        privateKey = await crypto.importKey('raw', privKey, algorithm, true, ['decrypt'])
    }
    // If the key is an object, then import it as a jwk
    else if (isPlainObject(privKey)) {
        privateKey = await crypto.importKey('jwk', privKey as JsonWebKey, algorithm, true, ['decrypt'])
    }

    // Decrypt the data and return it
    const decrypted = await crypto.decrypt(algorithm, privateKey as CryptoKey, dataBuffer)
    return toBase64 ? ArrayBuffToBase64(decrypted) : decrypted
}

export const getRandomHex = (size: number) : string => {
    // generate a new random secret and store it
    const randBuffer = new Uint8Array(size)
    // generate random id directly on the window.crypto object
    window.crypto.getRandomValues(randBuffer)
    // Store the id in the session as hex
    return ArrayToHexString(randBuffer)
}

//default export subtle crypto 
export default crypto;