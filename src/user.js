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

import { toSafeInteger, toInteger, isNil, defaultTo } from 'lodash'
import { useAxios } from './axios'
import { useSession, storeLoginCredentials, regenerateCredentials } from './session'
import { computed, watch } from 'vue'
import { useIntervalFn, useLocalStorage } from '@vueuse/core'
import { decodeJwt } from 'jose'
import { debugLog } from './util'

const getPath = path => `${import.meta.env.VITE_ACCOUNTS_BASE_PATH}${path}`

const paths = {
  login: getPath('/login'),
  mfa_totp: getPath('/login?mfa=totp'),
  logout: getPath('/logout'),
  profile: getPath('/profile'),
  keepAlive: getPath('/keepalive'),
  register: getPath('/register'),
  challenge: getPath('/challenge'),
  verify: getPath('/verify'),
  reset: getPath('/reset')
}

const { get, post } = useAxios()
const { loggedIn, publicKey, browserId } = useSession()

// Create a new proxy for the user's local storage
const userData = useLocalStorage(import.meta.env.VITE_USER_DATA_KEY, {})

// Ref to session poll interval
const pollRate = computed({
  get: () => userData.value.pollRate || 0,
  set: value => userData.value.pollRate = toSafeInteger(value)
})

const userName = computed(() => userData.value.userName)

//Interval to poll for session updates, calculated from pollRate
const pollRateMs = computed(() => pollRate.value === 0 ? (1000 * 60)  : pollRate.value * (1000 * 60))

useIntervalFn(async () =>{
  if (loggedIn.value === true) {
    await util.heartbeat()
  }
}, pollRateMs)

// watch for changes to the loggedIn state
watch(loggedIn, () => {
  // Make sure the user is logged in
  if (loggedIn.value !== true) {
    // remove the username if set since the user is not logged in
    userData.value.userName = null
  }
})

// Initial check on logged in state
if (!loggedIn.value) {
  // remove the username if set since the user is not logged in
  userData.value.userName = null
}

const util = {
  processMfa:function (mfaMessage, loginMessage) {
    //Mfa message is a jwt, decode it (unsecure decode)
    const mfa = decodeJwt(mfaMessage)
    
    debugLog(mfa)

    switch (mfa.type) {
      case 'totp':
        {
          // The server token is a base64 encoded secret that is encrypted with the client's public key
          return {
            async Submit(totpCode) {
              // Submit request to the server
              const response = await post(paths.mfa_totp, {
                //Pass raw upgrade message back to server as its signed
                upgrade: mfaMessage,
                code: toInteger(totpCode),
                localtime: new Date().toISOString()
              })
              // If the server returned a token, complete the login
              if (response.data.success && !isNil(response.data.token)) {
                await loginMessage.Finalize(response)
              }
              return response
            },
            type: 'totp',
            expires: mfa.expires
          }
        }
      case 'fido':
        return {
          async Submit() {

          }
        }
      case 'pgp':
        return {
          async Submit() {
          }
        }
      default:
        throw { message: 'Server responded with an unsupported two factor auth type, login cannot continue.' }
    }
  },
  heartbeat: async function () {
    //Invoke the keepalive endpoint
    const result = await post(paths.keepAlive)
    if(result.data.token){
      debugLog("Heartbeat returned a new token, regenerating credentials...")
      //If the server returned a token, store it
      await storeLoginCredentials(result.data)
    }
  },
}


/**
 * Gets data and controls related to the current user.
 * Allows for login, logout, and other user related actions.
 * @returns {Object} The user data and controls
 */
export const useUser = function () {

  const prepareLogin = function () {
    return {
      // get local time to ISO string when sending to server
      localtime: new Date().toISOString(),
      locallanguage: window.navigator.language,
      pubkey: publicKey.value,
      clientid: browserId.value,
      /**
       * Prepares the user's session to be logged in with the new context
       * @param {String} data The server response message to decode
       */
      async Finalize({ data }) {
        // Finalize the login with the session
        await storeLoginCredentials(data)
        // Set username ref
        userData.value.userName = data.result.email
      }
    }
  }

  const logout = async function () {
    // Send a post to the accoutn login endpoint to logout
    const result = await post(paths.logout)
    //regen credentials
    await regenerateCredentials()
    // return the response
    return result
  }

  const login = async function (username, password) {
    // prepare a new login for the current session
    const preppedLogin = prepareLogin()
    // Set the username and password
    preppedLogin.username = username
    preppedLogin.password = password
    // Send the login request
    const response = await post(paths.login, preppedLogin)
    // Check the response
    if (response.status === 200 && response.data.success === true) {
      // If the server returned a token, complete the login
      if (!isNil(response.data.token)) {
        await preppedLogin.Finalize(response)
      }
      // Check for a two factor auth mesage
      else if (response.data.mfa === true) {
        // Process the two factor auth message
        response.mfa = util.processMfa(response.data.result, preppedLogin)
        return response
      }
    }
    // return the response
    return response
  }

  const getProfile = async function () {
    // Get the user's profile from the profile endpoint
    const response = await get(paths.profile)
    // Set username ref
    userData.value.userName = defaultTo(response.data.email, userData.value.userName)
    // return response data
    return response.data
  }

  const resetPassword = async function(currentPass, newPass, args) {
    return await post(paths.reset, {
      current: currentPass,
      new_password: newPass,
      ...args
    })
  }
  
  return{
    /**
     * The current user's username
     */
    userName,
    /**
     * The heartbeat poll rate in minutes
     */
    pollRate: pollRate,
    /**
     * Prepares the current session for a logout and requests 
     * a logout against the server.
     * @returns {Promise<object>} The response of the logout request
     */
    logout,
    /**
    * Prepares the current session and attempts
    * to log the user in with the supplied credentials
    * against the server. mfa will be defined on the 
    * response if two factor auth is required.
    * @param {String} username The username to login with
    * @param {String} password The password to login with
    * @returns {Promise<object>} The response of the login request, which may contain an mfa property
    */
    login,
    /**
    * Requests the current user's profile from the server.
    * @returns {Promise<Object>} The user's data
    */
    getProfile,
    /**
     * Resets the user's password
     * @param {String} currentPass The current password
     * @param {String} newPass The new password
     * @param {Object} args Additional arguments to pass to the server
     */
    resetPassword,
    /**
   * Prepares a login message to send to the server for authentication.
   * The Finalize method should be called to complete the login, passing
   * the response from the server.
   * @returns The prepared login message
   */
    prepareLogin,

     /**
     * Manaully invoke the client/server heartbeat function
     */
    heartBeat: util.heartbeat
  }
}
