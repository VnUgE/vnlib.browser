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
import { debugLog } from "../util";
import crypto, { decryptAsync } from "../webcrypto";
import { ArrayBuffToBase64, Base64ToUint8Array } from '../binhelpers'
import { ISessionKeyStore } from "./types";
import { computed } from 'vue';
import { ISessionConfig, createReactiveStorage } from '../types';

const storageKey = "_vn-keys";

interface IStorageValue{
    private: string | null;
    public: string | null;
}

export const createKeyStore = (config: ISessionConfig) : ISessionKeyStore =>{
    //Get the storage backend
    const storageBackend = config.getStorage();

    //reactive storage element
    const storage = createReactiveStorage<IStorageValue>(storageKey, { private: null, public: null }, storageBackend);

    //Setup reactive properties
    const privateKey = computed({
        get: () => storage.value.private,
        set: (value) => storage.value.private = value
    });

    const publicKey = computed({
        get: () => storage.value.public,
        set: (value) => storage.value.public = value
    });

    const setCredentialAsync = async (keypair: CryptoKeyPair): Promise<void> =>{
        // Store the private key
        const newPrivRaw = await crypto.exportKey('pkcs8', keypair.privateKey);
        const newPubRaw = await crypto.exportKey('spki', keypair.publicKey);

        //Store keys as base64 strings
        privateKey.value = ArrayBuffToBase64(newPrivRaw);
        publicKey.value = ArrayBuffToBase64(newPubRaw);
    }

    const clearKeys = async (): Promise<void> =>{
        storage.value = { private: null, public: null };
    }

    const checkAndSetKeysAsync = async (): Promise<void> =>{
        const priv = privateKey.value;
        const pub = publicKey.value;

        // Check if we have a key pair already
        if (!isNil(priv) && !isNil(pub)) {
            return;
        }

        //Get config alg creds
        const alg = config.getKeyAlgorithm();

        // If not, generate a new key pair
        const keypair = await crypto.generateKey(alg, true, ['encrypt', 'decrypt']) as CryptoKeyPair;

        //Set credential
        await setCredentialAsync(keypair);

        debugLog("Generated new client keypair, none were found")
    }

    const regenerateKeysAsync = (): Promise <void> => {
        //Clear keys and generate new ones
        clearKeys();
        return checkAndSetKeysAsync();
    }

    const decryptDataAsync = async (data: string | ArrayBuffer): Promise<ArrayBuffer> => {
        // Convert the private key to a Uint8Array from its base64 string
        const keyData = Base64ToUint8Array(privateKey.value || "")

        const keyAlg = config.getKeyAlgorithm();

        //import private key as pkcs8
        const privKey = await crypto.importKey('pkcs8', keyData, keyAlg, false, ['decrypt'])
        
        // Decrypt the data and return it
        return await decryptAsync(keyAlg, privKey, data, false) as ArrayBuffer
    }

    const decryptAndHashAsync = async (data: string | ArrayBuffer): Promise<string> => {
        // Decrypt the data
        const decrypted = await decryptDataAsync(data)

        // Hash the decrypted data
        const hashed = await crypto.digest({ name: 'SHA-256' }, decrypted)

        // Convert the hash to a base64 string
        return ArrayBuffToBase64(hashed)
    }

    return{
        publicKey,
        clearKeys,
        checkAndSetKeysAsync,
        regenerateKeysAsync,
        decryptDataAsync,
        decryptAndHashAsync
    }
}

