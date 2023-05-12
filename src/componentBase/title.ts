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

import { tryOnBeforeMount } from "@vueuse/core"
import { Ref, readonly, ref } from "vue"

export interface ITitle{
    /**
     * The current page title value (readonly)
     */
    readonly title: Readonly<Ref<string | undefined>>;
    /**
     * Sets the current page title (sets the internal title ref)
     * @param title The title to set (or clear if empty)
     */
    setTitle(title: string | undefined): void;
}

const Title = (title : Ref<string | undefined>) : ITitle => {
    const setTitle = (t: string | undefined) => {
        title.value = t;
    }
    return{
        title: readonly(title),
        setTitle
    }
}

/**
 * Sets the document title
 * @returns {Object} { title: String, setTitle: Function }
 * @example //title is reactive
 * const { title, setTitle } = useTitle()
 * setTitle('My Title') //Manually set the title
 * setTitle('') //Manually clear the title
 */
export const useTitle = (() => {

    //Reactive title
    const _title = ref('')

    return (title: string): ITitle => {
        const tt = Title(_title);

        //Set title on mount
        tryOnBeforeMount(() => tt.setTitle(title))

        return tt
    }
})()
