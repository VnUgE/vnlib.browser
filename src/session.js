// Copyright (c) 2022 Vaughn Nugent
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


import _ from 'lodash'
import { ref, readonly, watch, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useCookies } from '@vueuse/integrations/useCookies'
import { ArrayBuffToBase64, ArrayToHexString } from './binhelpers'
import crypto, { hmacSignAsync, decryptAsync } from './webcrypto'

const BID_SIZE = 32

// Basic RSA config to allow encryption and decryption of data
const RSA_ALG = Object.freeze({
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: { name: 'SHA-256' }
})

//reactive li cookie
const liCookieValue = (function () {
  const _cookies = useCookies([], { doNotParse: true, autoUpdateDependencies: true })
  
  const get = () => _cookies.get(import.meta.env.VITE_LOGIN_COOKIE_ID || 'li')
  const cookieref = ref(get())
  let lastValue = get()
  //Watch for changes to the cookie and update the ref
  window.setInterval(() => _.defer(() => {
    const newValue = get()
    if (!_.isEqual(newValue, lastValue)) {
      lastValue = cookieref.value = newValue
    }
  }), 100)
  return computed(() => _.toSafeInteger(cookieref.value))
})()

const _pwChallenge = ref(null)
// Create a new proxy for the login token
const sessionData = useLocalStorage(import.meta.env.VITE_SESSION_KEY, {})
// Create a new proxy for the user's private/public storage
const _keyStore = useLocalStorage(import.meta.env.VITE_BROWSER_CREDS_KEY, {})
// Reactive referrence to logged in to allow reactive components
const loggedInRef = computed(() => {
  const tokenVal = !_.isEmpty(sessionData.value.token)
  return liCookieValue.value > 0 && tokenVal
})

// Watch for changes to logged-in ref
watch(loggedInRef, () => _.defer(() => {
  if (!loggedInRef.value) {
    sessionData.value.token = null
    _pwChallenge.value = null
    sessionData.value.pwsecret = null
  }
}))

const util = {
  
  checkAndSetClientSecret: async function () {
    // See if the client keypair is set
    if (_.isNil(_keyStore.value.private) || _.isNil(_keyStore.value.public)) {
      // If not, generate a new key pair
      const keypair = await crypto.generateKey(RSA_ALG, true, ['encrypt', 'decrypt'])
      // Store the private key
      _keyStore.value.private = await crypto.exportKey('jwk', keypair.privateKey)
      // Store the public key in spki format for the server to accept
      const pub = await crypto.exportKey('spki', keypair.publicKey)
      // Convert public key to base64
      _keyStore.value.public = ArrayBuffToBase64(pub)
    }
    // Check browser id
    if (_.isNil(sessionData.value.bid)) {
      // generate a new random secret and store it
      const randBuffer = new Uint8Array(BID_SIZE)
      // generate random id
      window.crypto.getRandomValues(randBuffer)
      // Store the id in the session as hex
      sessionData.value.bid = ArrayToHexString(randBuffer)
    }
  },  
  /**
   * Computes and (temporarily stores) a signed hash of the user's password
   * to send to the server
   * @param {String} password
   * @returns The base64 digest of the password
   */
  computePwHash: async function (password) {
    // password buffer from string
    const passwordBuf = new TextEncoder().encode(password)
    // Sign data
    const base64Digest = await hmacSignAsync(sessionData.value.pwsecret, passwordBuf, 'SHA-512', true)
    // Store in ref
    _pwChallenge.value = base64Digest
    // Set timer to clear
    setTimeout(() => _pwChallenge.value = null, import.meta.env.VITE_CHALLENGE_TIMEOUT_MS)
    // Convert to base64
    return base64Digest
  },
  /**
  * Computes and stores the session long password derivation key
  */
  storePwSecret: async function (base64Encrypted) {
    // Recover secret from encrypted data
    const decrypted = await decryptData(base64Encrypted)
    // Store the secret in base64
    sessionData.value.pwsecret = ArrayBuffToBase64(decrypted)
  },
  /**
  * Configures the current browser session to the logged in state.
  * @param {string} time The captured time the login message was prepared.
  * @param {string} serverToken The server-side salt used to generate the login hash
  * @returns Promise<void> A promise that completes when the session is configured
  */
  computeToken: async function (serverToken) {
    // The server token is a base64 encoded secret that is encrypted with the client's public key
    // Decrypt the server token buffer
    const decrypted = await decryptData(serverToken)
    // Hash the decrypted data
    const hashed = await crypto.digest({ name: 'SHA-384' }, decrypted)
    // Convert the hash to a base64 string
    sessionData.value.token = ArrayBuffToBase64(hashed)
  }, 
}

/**
 * Stores the users session credentials from a server login event
 */
export const storeLoginCredentials = async function(response){
  // Compute the login token
  await util.computeToken(response.token)
  // If password token is set, set it
  if (!_.isNil(response.pwtoken)) {
    await util.storePwSecret(response.pwtoken)
  }
}

/**
 * Decryptes the supplied ciphertext using the stored
 * private key.
 * @param {ArrayBuffer | string} data Cipher text to decrypt, either a base64 string or an arrayBuffer
 * @returns A promise that completes when the decryption is complete
 */
const decryptData = async function (data) {
  // Decrypt the data and return it
  return await decryptAsync(RSA_ALG, _keyStore.value.private, data, false)
}

/**
 * Decryptes the supplied ciphertext from the server for the current session, and computes the digest 
 * of the decrypted data, and returns a base64 encoded string of the digest.
 * @param {ArrayBuffer | string} data Cipher text to decrypt, either a base64 string or an arrayBuffer 
 * @returns {Promise<string>} A promise that resolves the base64 encoded digest of the decrypted data
 */
const decryptAndHash = async function (data) {
  // Decrypt the data
  const decrypted = await decryptData(data)
  // Hash the decrypted data
  const hashed = await crypto.digest({ name: 'SHA-256' }, decrypted)
  // Convert the hash to a base64 string
  return ArrayBuffToBase64(hashed)
}

/**
 * Regnerates the stored RSA key pair for the current session. 
 * This will invalidate the current login session and require the user to log in again.
 * @returns {Promise<void>} a promise that completes when the key pair is regenerated
 */
export const regenerateCredentials = async function () {
  _keyStore.value.private = null
  _keyStore.value.public = null
  await util.checkAndSetClientSecret()
}

const passwordChallenge = (function(){
  return {
    // Password challenge functions
    computeChallenge: util.computePwHash,
    storeChallenge: util.storePwSecret,
    reset: () => _pwChallenge.value = null,
    challenge: readonly(_pwChallenge),
  }
})()

/**
 * use the utility functions for the current session
 */
export const useSessionUtils = function () {
  return{
    decryptAndHash, 
    decryptData,
    passwordChallenge,
  }
}

/**
 * Gets the current user's/browser's session data object
 * use to check or manipulate the client-server session
 */
export const useSession = function () {

  //Initial check on secret, dont await it
  util.checkAndSetClientSecret()

  const ret = {
    /**
     * Gets a value that indicates if the session is considered logged in.
     */
    loggedIn: readonly(loggedInRef),
    /**
     * Gets the curent base64 login token.
     */
    token: computed(() => sessionData.value.token),

    /**
     * Gets a value that inidcates if the current session belongs to a local user account, or an externally authenticated account.
     */
    isLocalAccount: computed(() => liCookieValue.value === 1 && !_.isNil(sessionData.value.pwsecret)),

    /**
     * Gets the stored browser id for the current session.
     */
    browserId: computed(() => sessionData.value.bid),
    /**
     * The session system public key used by the server to encrypt client data
     */
    publicKey: computed(() => _keyStore.value.public),
  }

  return ret
}