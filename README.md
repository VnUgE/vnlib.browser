# @vnuge/vnlib.browser

This repo contains the client side JavaScript library for interacting with the VNLib.Plugins.Essentials.Accounts user account api and security system. This library was also configured for use in web-extension context. 

## Setup

The simplest way to get started is to install the package as a archive via npm. 

``` bash
npm install https://www.vaughnnugent.com/public/resources/software/releases/vnlib-browser/latest.tgz -O vnlib-browser.tgz
```

The latest version will always be available at *latest.tgz*
Or via version number *v0.1.0.tgz*

## Configuring the global state

``` JavaScript
import { configureApi } from '@vnuge/vnlib.browser'
configureApi({
	session:{
		//your session config
	},
	user:{
		//your user config
	},
	axios:{
		//your axios config
	}
})
```

It is best to call this method at the start of your app, say in your main.js file. This method is deigned to be called at any time in your application to update your config. This is useful if you wish to have user-adjustable config, such as in web-extension context. 

**Note** Your code that calls `useAxios()` won't reflect the new *axios specific* config such as your baseURL, headers, etc., so you will need to call `useAxios()` again to capture the new global axios config.

By default all persistent storage is disabled, you must set persistent storage that implements the `StorageLike` interface if you wish to persist session state across reloads (localStorage should be used in browser context)

Calling `configureApi()` has a side-effect, it will also cause the session's KeyStore to check for a previous credential pair in persistent storage, and if not present, generate a new credential pair and writes it to your storage. 

## Consuming modules

**Note:** the *use* prefix to module exports are consistent with the vue/vueuse patterns that return reactive properties, most should be read-only.

### Session

Session session state info, session utilities, such as credential reading/updating

``` JavaScript
import { useSession, useSessionUtils } from '@vnuge/vnlib.browser'

const { loggedIn, isLocalAccount, browserId, publicKey } = useSession();
const { KeyStore,
	   checkAndSetCredentials,
	   updateCredentials,
	   generateOneTimeToken,
	   clearLoginState } = useSessionUtils();
```

The session module is a core module that most other modules depend on for session state information, such as knowing if the browser is considered authenticated. It maintains the session security information required for authorized communication to a backend server that relies on the Essentials.Accounts security system. This server implementation currently relies on a few features such as cookies and authentication tokens. You should check out the [server library](https://github.com/VnUgE/Plugins.Essentials/tree/master/plugins/VNLib.Plugins.Essentials.Accounts) yourself to understand the protocol. In short a credential pair is stored in persistent storage, for initial authentication and secret sharing. After initial authentication an ephemeral symmetric key is shared and used to sign one-time tokens that are sent with every request. 

This means that the `useAxios()` method configures interceptors to add the token header to every request for you. Optionally you could use the `generateOneTimeToken()` method to get this token yourself if you wish. 

#### Security notes
I understand this system cannot bet MITM resistant, it was a simple way to add a bit more complexity to per-request tokens and avoid plain-text secret sharing. The idea was to serve as nothing more than a speed-bump for now. That being said most apis are only available in secure context, so TLS is required for all features. 

### User

``` JavaScript
import { useUser, useAutoHeartbeat } from '@vnuge/vnlib.browser'
const { userName,
        prepareLogin,
        logout,
        login,
        getProfile,
        resetPassword,
        heartbeat } = useUser()
        
//Configure the auto-heartbeat when logged in to update credentials
const interval = useAutoHeartbeat(5 * 60 * 1000);
//Manual heartbeat request
await heartbeat();

//basic usage
await login('username', 'password');
await logout();
const profile = await getProfile();
await resetPassword('oldPass','newPass');

//mfa response that expires 
const { mfa } = await login('username', 'password');
//Submit totp code
if(mfa.type === 'totp')
	await mfa.Submit(000000);

//custom login flow
const newLogin = prepareLogin();
const response = await axios.post('/login', newLogin);
//must call finalize to complete the session auth
await newLogin.finalize(response);
```

Internally the User module calls the `useAxios()` on method calls that execute requests against your server. 

The `userName` property is readonly-reactive and updates when a successful login has been completed during the `loginMessage.finalize(axiosResponse)` method is called and the response contains a proper login response message from the server

#### Mfa support
This library supports mutli factor authentication (currently only totp) login flows. Responses from the `login()` method must be observed for the mfa object presence, to continue mfa login flow.  See example above.

#### Heartbeat/keepalive
The Essentials.Accounts module exposes (if enabled) a keepalive endpoint that regenerates the users credentials after a configurable period of time and invalidates previous credentials. You may configure auto-heartbeat with a reactive interval to allow your users to stay logged in indefinitely, or allow the credentials to expire and eventually auto-log out. 

### Axios

The axios module allows you to capture a globally configured AxiosIntance that automatically supports authorized requests using the internal session module.

```Javascript
import { useAxios } from '@vnuge/vnlib.browser'
const axios = useAxios();
//or customize your instance
const customAxios = useAxios({baseURL:'https://example.com'});
//GET request with automatic authentication
const {data} = await axios.get('/auth/endpoint');
```

As stated above, calling `useAxios` will capture and merge the global api state and axios configuration with your custom configuration. If `configureApi()` is called after `useAxios` the axios config will be unchanged, but proper authorization interceptors will be 'updated' 

## Helper modules
I have added a number of common methods and utlities that I use to speed up developing Vuejs browser applications with client/server state communication.  

### Toast/notifications
A shared state notification system integrated with other library modules
```JavaScript
import { useToaster, useGeneralToaster, useFormToaster } from '@vnuge/vnlib.browser'
const { general, form } = useToaster();
general.success({title:'Success', text:'Success'});
```

Global Configuration
```JavaScript
import { configureNotifier } from '@vnuge/vnlib.browser'
const notify = (notificationConfig) => {}  //called on notification
const close = () => {}   //called on close request
configureNotifier({notify, close}); //set notifier
```

Toasters are split into *form* and *general* toast type messages. Internal components only capture errors for you, and will only ever publish error messages to the form toaster. Two toaster concepts are used to allow for form-based messages, and general application messages, usually out of focus and a lower priority

### apiCall

```JavaScript
import { apiCall, configureApiCall, useWait } from '@vnuge/vnlib.browser'
//Waiting flag reflects the state of the api call method
const { waiting } = useWait();
//Api call wrapper that handles request errors, with axios and toaster
const response = await apiCall(async ({axios, toaster}) => {
	//Axios error throws, and is handled by the api call wrapper to display an error toast notification
	return await axios.post('/returns403', {});
});
```

The call to apiCall always returns, the result from the inner method call is returned only if the call was successful, otherwise the result is undefined. If an error occurred an error toaster notification is published.  

This method is useful in applications that make server requests and want a unified and simple way to display errors to users. You may use this method to wrap any asynchronous operation that may throw.

### useWait

``` JavaScript
import { apiCall, configureApiCall, useWait } from '@vnuge/vnlib.browser'
//Waiting flag reflects the state of the api call method
const { waiting, setWait } = useWait();
setWait(true);
waiting.value //true
setWait(false);
waiting.value //false
```

Use wait is a handle little utility that allows you to watch a reactive package global waiting flag. When the `apiCall()` method is asynchronously waiting, the `waiting` value is set to true. 

This module is useful for displaying waiting messages to users during asynchronous operations.

### useTitle
A reactive variable that is meant for storing the page title in vuejs
```JavaScript
import { useTitle } from '@vnuge/vnlib.browser'
const { title, setTitle } = useTitle('MyWebPage');
setTitle('AlternatePage')
```

You must observe the reactive title variable and update your page title in your html head element, this module does not set your page title for you. 

### usePageGuard
Uses session status and VueRouter to guard a guard a protected route. This method simply controls the VueRouter instance and does not required configuring an onBeforeRouteEnter navigation guard.
```JavaScript
import { usePageGuard } from '@vnuge/vnlib.browser'
//default login route named 'Login'
usePageGuard();
//custom login route
usePageGuard({name:'MyLoginRoute', path:'/mylogin/path');
```

This method simply checks if the session is currently logged in, if it is, the method returns, if not, the method pushes the current page onto the last-page stack, and redirects the user to the specified login route. 

If the user state transitions to be no longer logged-in, the same action is taken. The user is redirected to the login route and the current page is pushed into the last-page stack. This is useful to catch a session that expires and automatically redirects to the login-page again

### useLastPage
Configures a last-page stack that allows protected routes to store the current page, and then redirect the user to the exact location they were before the logged-out, or their session expired. 
```Javascript
import { useLastPage } from '@vnuge/vnlib.browser'
const { push, pushAndNavigate, gotoLastPage } = useLastPage(customStack?);
//push the current page into the storage
push();
//Push current page and navigate to the desired route
pushAndNavigate(route);
//Pop the last page and naviate to route
gotoLastPage();
```

I refer to the last-page as a 'stack' but really is only holds a single route in FiFo semantics, unless you configure your own storage object to store more routes. By default sessionStorage is used as persistent storage for the last-page 'stack'

Your custom storage must implement the `ILastPageStorage` interface that pushes and pops string routes. If undefined is returned from a call to `pop()` nothing happens. 

### useConfirm
A global/shared instance of [useConfirmDialog](https://vueuse.org/core/useConfirmDialog/#useconfirmdialog) used to implement a confirm prompt across your entire site. 

### usePassConfirm
Extends the useConfirm that is used to capture a use's password before executing a server request

```JavaScript
import { usePassConfirm } from '@vnuge/vnlib.browser'
//In your dialog component
const { confirm } = usePassConfirm();
confirm({pwData:'userPass'});//This object is passed directly to the caller

//using the api call element
const { elevatedApiCall } = usePassConfirm();
//usage, password is a passthrough from your element
const result = await elevatedApiCall(async ({..., pwData}) =>{});
```

You can see an exposed method called `elevatedApiCall` that works like the  `apiCall` module, except it calls the `reveal()` method on the global dialog and waits for it to be captured successfully.  When cancelled, simply returns undefined to the caller. If the server returns a 401 error message, the password prompt is re-revealed, awaiting the user's password. All other errors will fall back to the `apiCall` wrapper behavior. 

### useEnvSize
A shared state for reading (and writing) document element sizes, helpful when developing menus, or adjusting content, or even fixing the footer that wont stay at the bottom.

```JavaScript
import { useEnvSize } from '@vnuge/vnlib.browser'
//read or write state values directly
const { footerHeight, headerHeight, contentHeight } = useEnvSize();
//get refs for v-bind html elements
const { header, footer, content, ... } = useEnvSize(true);
<header ref="header"/>
<div id="content" ref="content"/>
<footer ref="footer"/>
```

On your app's entry point you will want to set the v-ref on the header/footer and your app's content entry-point elements by exporting the refs by calling `useEnvSize(true)`

All other parts of your app will call `useEnvSize(false?)` to read the computed sizes of your page elements. 

### useScrollOnRouteChange
When called, watches for route changes, and scrolls the page to the top on route change.

```JavaScript
import { useScrollOnRouteChange } from '@vnuge/vnlib.browser'
useScrollOnRouteChange(); // thats all
```

Usually you enable this in your top level element or your main file, this must be called after the router was loaded. 

### useMessage
Message is a term used control error messages across operations in an application. By default the output of the message system writes error events to the formToaster system. It simplifies publishing and clearing error notifications through this library. You may the message system by calling `useMessage()`. 

```JavaScript
import { useMessage } from '@vnuge/vnlib.browser'
const { setMessage, onInput, clearMessage } = useMessage();
setMessage("My Error Title", "My Error Message");
clearMessage(); //same as onInput()
```

Again, when calling `setMessage()` an error notification is published to the form toaster.

The `onInput()` method is a legacy method that simply calls the `clearMessage()` method internally, it may be used to clear error messages when a user starts typing again, by capturing the @input or @change events in input fields.