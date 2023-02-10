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


import { isEmpty, isNil, isArray, defaultTo, isEqual } from 'lodash'
import { useRoute, useRouter } from 'vue-router'
import { computed, reactive, readonly, ref, watch } from 'vue'
import { useSession } from './session'
import { useFormToaster, useToaster } from './toast.js'
import { useAxios } from './axios'
import { notify } from '@kyvg/vue3-notification'
import { useConfirmDialog, useSessionStorage, watchThrottled, tryOnMounted } from "@vueuse/core";

//const validationTitle = 'Please verify your form'
const formMessageId = 'form-message'

const { loggedIn } = useSession()
const axios = useAxios()
const _toaster = useToaster()
const { error } = useFormToaster()
const _message = ref('')
const _waiting = ref(false)
//Last page store in session for page guard
const lastPage = useSessionStorage('lastPage', null)

const notifyError = function (title, text = '') {
  error({
    title: title,
    id: formMessageId,
    text: text,
    duration: 7000
  })
}

const validate = async function (v$) {
  //clear message (oninput)
  _message.value = ''
  // Validate the form
  const valid = await v$.value.$validate()
  // If the form is no valid set the error message
  if (!valid) {
    // Set the error message to the first error in the form list
    notifyError(v$.value.$errors[0].$message)
  }
  return valid
}

//Clear the form message when message is cleared
watch(_message, () => !isEmpty(_message.value) ? notifyError(_message.value, '') : notify.close(formMessageId))

/** 
 * When called, configures the component to 
 * only be visible when the user is logged in. If the user is 
 * not logged in, the user is redirected to the login page. 
 * @remarks Once called, if the user is logged-in changes will be
 * watch to redirect if the user becomes logged out.
*/
export const usePageGuard = function () {

  const { push } = useRouter()
  const route = useRoute() 

  const goToLogin = () =>{
    //Store last route in session
    lastPage.value = route.fullPath
    //Save the last page to return to after login
    push({ name: 'Login' })
  }

  // Initial check for logged in to guard the page
  if(!loggedIn.value){ 
    goToLogin();
  }
  // setup watcher on session login value
  // If the login value changes to false, redirect to login page
  watch(loggedIn, value => !value ? goToLogin() : null)
}

/**
 * Gets the configuration for the last page the user was on 
 * when the page guard was called. This is used to return to the
 * last page after login.
 * @returns { lastPage: Readonly<Ref<string>>, gotoLastPage: Function }
 */
export const useLastPage = function () {
  const { push } = useRouter()
  return{
    /**
     * The last page stored in session when the page 
     * guard was called. This is used to return to the
     * last page after login.
     */
    lastPage: readonly(lastPage),
    gotoLastPage: () => {
      if(lastPage.value){
        push(lastPage.value)
        //Clear last page
        lastPage.value = null
      }
    }
  }
}

/**
 * Provides a wrapper method for making remote api calls to a server
 * while capturing context and errors and common api arguments.
 * @param {*} asyncFunc The method to call within api request context
 * @param {*} message An error message to display if the async function fails
 * @returns A promise that resolves to the result of the async function
 */
export const apiCall = async function(asyncFunc, message = undefined){

  //Allow a custom message proxy to be passed in
  const __message = message || _message;

  // Set the waiting flag
  _waiting.value = true
  try {
    // Clear pending messages
    __message.value = ''
    //Exec the async function
    const result = await asyncFunc({ axios, toaster: _toaster })
    return result
  } catch (errMsg) {
    console.error(errMsg)
    // See if the error has an axios response
    if (isNil(errMsg.response)) {
      if (errMsg.message === 'Network Error') {
        notifyError('Please check your internet connection')
      } else {
        notifyError(errMsg.message)
      }
      return
    }
    // Axios error message
    const response = errMsg.response
    const errors = response?.data?.errors
    const hasErrors = isArray(errors) && errors.length > 0
    const SetMessageWithDefault = (message) => {
      if (hasErrors) {
        const title = 'Please verify your ' + defaultTo(errors[0].property, 'form')
        notifyError(title, errors[0].message)
      } else {
        notifyError(defaultTo(response?.data?.result, message))
      }
    }
    switch (response.status) {
      case 200:
        SetMessageWithDefault('')
        break
      case 400:
        SetMessageWithDefault('Bad Request')
        break
      case 422:
        SetMessageWithDefault('The server did not accept the request')
        break
      case 401:
        SetMessageWithDefault('You are not logged in.')
        break
      case 403:
        SetMessageWithDefault('Please clear you cookies/cache and try again')
        break
      case 404:
        SetMessageWithDefault('The requested resource was not found')
        break
      case 409:
        SetMessageWithDefault('Please clear you cookies/cache and try again')
        break
      case 410:
        SetMessageWithDefault('The requested resource has expired')
        break
      case 423:
        SetMessageWithDefault('The requested resource is locked')
        break
      case 429:
        SetMessageWithDefault('You have made too many requests, please try again later')
        break
      case 500:
        SetMessageWithDefault('There was an error processing your request')
        break
      default:
        SetMessageWithDefault('An unknown error occured')
        break
    }
  } finally {
    // Clear the waiting flag
    _waiting.value = false
  }

}

/**
 * Uses the internal waiting flag to determine if the component should be waiting
 * based on pending apiCall() requests.  
 * @returns {Object} { waiting: Boolean, setWaiting: Function }
 * @example //Waiting flag is reactive
 * const { waiting, setWaiting } = useWait()
 * setWaiting(true) //Manually set the waiting flag
 * setWaiting(false) //Manually clear the waiting flag
 */
export const useWait = () => {
  return{
    /**
     * The waiting flag
     */
    waiting: readonly(_waiting),
    /**
     * Sets the waiting flag to the value passed in
     * @param {Boolean} value The value to set the waiting flag to
     */
    setWaiting: (value) => _waiting.value = value
  }
}

export const useMessage = () => { 
  return {
    validate:(v$) => validate(v$),
    setMessage: (msg) => _message.value = msg,
    message: readonly(_message),
    clearMessage: () => _message.value = '',
    onInput: () => _message.value = ''
  }
}

/* Confirm */
export const useConfirm = (function () {

  const _promptMessage = ref({})

  const { isRevealed, reveal, confirm, cancel, onReveal, onCancel, onConfirm } = useConfirmDialog()

  //Store event data on reaveal event
  onReveal(data => _promptMessage.value = data)

  return () =>{
    return {
      reveal,
      onCancel,
      onConfirm,
      onReveal,
      isRevealed: readonly(isRevealed),
      cancel,
      confirm,
      message: readonly(_promptMessage)
    }
  }
})()

/* pw prompt */
export const usePassConfirm = (function () {

  const { isRevealed, reveal, confirm, cancel, onReveal, onCancel, onConfirm } = useConfirmDialog()

  /**
   * Similar to apiCall except it will prompt for a password, and handle 401
   * errors for invalid password when executing the async api call
   * @param {Function} asyncFunc The callback function to execute when password has been supplied 
   * @remarks The callback function is passed the same variables as apiCall, but includes 'challenge' 
   * which is the encrypted password
   */
  const elevatedApiCall = async function (asyncFunc) {
    await apiCall(async (apidc) => {
      // eslint-disable-next-line no-constant-condition
      while (1) {
        const { data, isCanceled } = await reveal()
        if (isCanceled) {
          break
        }
        try {
          apidc.challenge = data.challenge
          await asyncFunc(apidc)
        }
        catch (err) {
          const response = err.response
          // If the error is not password related, then hide the prompt
          if (isEqual(response?.status, 401)) {
            apidc.toaster.form.error({
              title: response.data.result
            })
            //Re-display the password prompt
            continue
          } else {
            throw err;
          }
        }
        break
      }
    })
  }

  return () =>{
    return {
      reveal,
      onCancel,
      onConfirm,
      onReveal,
      isRevealed: readonly(isRevealed),
      cancel,
      confirm,
      elevatedApiCall
    }
  }
})()

export const useEnvSize = (function(){
  const envState = reactive({
    footerHeight: 0,
    headerHeight: 0,
    contentHeight: 0
  })

  return () => {
    return{
      footerHeight: computed({
          get: () => envState.footerHeight,
          set: (value) => envState.footerHeight = value
      }),
      headerHeight: computed({
          get: () => envState.headerHeight,
          set: (value) => envState.headerHeight = value
        }
      ),
      contentHeight: computed({
          get: () => envState.contentHeight,
          set: (value) => envState.contentHeight = value
      })
    }
  }
})()

/**
 * Configures a listener to watch for route changes and 
 * scrolls the window to the top of the page to reset the scroll position.
 * @remarks This is useful for single page applications that use the router, it should 
 * only be called once in the main app component.
 */
export const useScrollOnRouteChange = function(){

  //Get route to watch for changes
  const route = useRoute() 

  //Watch throttled and scroll when route changes
  watchThrottled(route, () => window.scrollTo(0, 0), {immediate: true, deep: true, throttle:100})

}

const _title = ref('')

/**
 * Sets the document title
 * @returns {Object} { title: String, setTitle: Function }
 * @example //Title is reactive
 * const { title, setTitle } = useTitle()
 * setTitle('My Title') //Manually set the title
 * setTitle('') //Manually clear the title
 */
export const useTitle = function(title = null){
  
  const setTitle = title => _title.value = title
  
  //Set title on mount
  tryOnMounted(() => setTitle(title))

  return {
    title: readonly(_title),
    setTitle
  }
}