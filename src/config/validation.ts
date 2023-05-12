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
import { useVuelidateWrapper as vuelidate, useValidationWrapper as validate, IValidator, VuelidateInstance } from "../componentBase";
import { IErrorNotifier, useFormToaster } from "../toast";

/**
 * Wraps a validator with a toaster to display validation errors
 * @param validator The validator to wrap
 * @param toaster The toaster to use for validation errors
 * @returns The validation toast wrapper
 * @example returns { validate: Function<Promise<boolean>> }
 * const { validate } = useValidationWrapper(validator, toaster)
 * const result = await validate()
 */
export const useValidationWrapper = (v$: Readonly<Ref<IValidator>>, toaster: IErrorNotifier | null = null) => {
    //Use the form toaster by default if no toaster is provided
    toaster ??= useFormToaster();
    return validate(v$, toaster);
}

/**
 * Wraps a vuelidate validator instance with a validation handler that reports 
 * errors to the the notifier or form toaster if no custom notifier is provided
 * @param v$ The vuelidate object to wrap
 * @param toaster An optional toaster to use for displaying errors
 * @returns The validation toast wrapper
 * @example returns { validate: Function<Promise<boolean>> }
 * const { validate } = useValidationWrapper(validator, toaster)
 * const result = await validate()
 */
export const useVuelidateWrapper = <T extends VuelidateInstance>(v$ : Readonly<Ref<T>>, toaster: IErrorNotifier | null = null) =>{
    //Use the form toaster by default if no toaster is provided
    toaster ??= useFormToaster();
    return vuelidate(v$, toaster);
}