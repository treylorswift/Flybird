//classes and types used for remote procedure calls.. calls that have to cross some kind of boundary
//whether it be inter process communication, websocket communication, etc
define("Shared/RPC", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Call {
        Call(options) {
            return Transport.g_transport.Call(this, options);
        }
        CallNoResponse(options) {
            return Transport.g_transport.CallNoResponse(this, options);
        }
    }
    exports.Call = Call;
    var Error;
    (function (Error) {
        Error["NotLoggedIn"] = "NotLoggedIn";
        Error["Unauthorized"] = "Unauthorized";
        Error["InvalidMethod"] = "InvalidMethod";
        Error["InvalidParams"] = "InvalidParams";
        Error["InvalidInternalResponse"] = "InvalidInternalResponse";
        Error["Internal"] = "Internal";
        Error["Timeout"] = "Timeout";
        Error["Unknown"] = "Unknown";
    })(Error = exports.Error || (exports.Error = {}));
    function ErrorFromString(s) {
        //if there is no error object, we shouldn't create one.. leave it undefined
        if (s === undefined || s === null)
            return undefined;
        if (typeof (s) !== "string") {
            console.log("ErrorFromString - input was not a string type: " + typeof (s) + " - " + JSON.stringify(s));
            return Error.Unknown;
        }
        var err = Error[s];
        if (err === undefined) {
            console.log("ErrorFromString - unrecognized string code: " + s);
            err = Error.Unknown;
        }
        return err;
    }
    exports.ErrorFromString = ErrorFromString;
    class Response {
        //the idea here is that the constructor takes a raw json
        //fresh off a websocket or http response, and make sure the contents
        //map into the Response object as defined by typescript
        constructor(json) {
            this.success = json.success === true;
            if (this.success === false)
                this.error = ErrorFromString(json.error);
            else
                this.error = undefined;
            //all other property names are to be decoded/validated by subclasses of Response
        }
    }
    exports.Response = Response;
    class Transport {
    }
    exports.Transport = Transport;
    Transport.g_transport = null;
    function SetTransport(t) {
        Transport.g_transport = t;
    }
    exports.SetTransport = SetTransport;
    function SetHandler(className, func) {
        Transport.g_transport.SetHandler(className, func);
    }
    exports.SetHandler = SetHandler;
});
define("Shared/TwitterAuth", ["require", "exports", "fs"], function (require, exports, fs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //make sure the app auth that came from storage contains the appropriate keys and that they are at least non-empty strings
    function TypeCheckAppAuth(app_auth) {
        if (!app_auth.consumer_key || !app_auth.consumer_secret ||
            typeof (app_auth.consumer_key) !== 'string' ||
            typeof (app_auth.consumer_secret) !== 'string') {
            return false;
        }
        return true;
    }
    //will silently return null if unable to open and successfully type-check app auth key file
    function TryLoadAppAuth(fileName) {
        let app_auth;
        try {
            app_auth = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
        }
        catch (err) {
            return null;
        }
        if (TypeCheckAppAuth(app_auth))
            return app_auth;
        return null;
    }
    exports.TryLoadAppAuth = TryLoadAppAuth;
    //will loudly report errors if unable to open or successfully type-check app auth key file, AND process.exit(-1)
    function LoadAppAuth(fileName) {
        let app_auth;
        try {
            app_auth = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
        }
        catch (err) {
            console.log(`Error reading ${fileName}:`);
            console.error(err);
            process.exit(-1);
        }
        if (TypeCheckAppAuth(app_auth))
            return app_auth;
        console.log(`${fileName} has invalid or missing consumer_key and/or consumer_secret: ${JSON.stringify(app_auth)}`);
        process.exit(-1);
    }
    exports.LoadAppAuth = LoadAppAuth;
    //make sure the app auth that came from storage contains the appropriate keys and that they are at least non-empty strings
    function TypeCheckUserLogin(user_login) {
        if (!user_login.access_token_key || !user_login.access_token_secret ||
            !user_login.id_str || !user_login.screen_name ||
            typeof (user_login.access_token_key) !== 'string' ||
            typeof (user_login.access_token_secret) !== 'string' ||
            typeof (user_login.id_str) !== 'string' ||
            typeof (user_login.screen_name) !== 'string') {
            return false;
        }
        return true;
    }
    //will silently return null if unable to open and successfully type-check user auth key file
    function TryLoadUserLogin(fileName) {
        let user_auth;
        try {
            user_auth = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
        }
        catch (err) {
            return null;
        }
        if (TypeCheckUserLogin(user_auth))
            return user_auth;
        return null;
    }
    exports.TryLoadUserLogin = TryLoadUserLogin;
    //will loudly report errors if unable to open or successfully type-check app auth key file, AND process.exit(-1)
    function LoadUserLogin(fileName) {
        let user_login;
        try {
            user_login = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
        }
        catch (err) {
            console.log(`Error reading ${fileName}:`);
            console.error(err);
            process.exit(-1);
        }
        if (TypeCheckUserLogin(user_login))
            return user_login;
        console.log(`${fileName} has invalid or missing access_token_key and/or access_token_secret: ${JSON.stringify(user_login)}`);
        process.exit(-1);
    }
    exports.LoadUserLogin = LoadUserLogin;
});
define("Shared/ServerApi", ["require", "exports", "Shared/RPC"], function (require, exports, RPC) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let g_loggedInUser = null;
    async function GetLoggedInUser() {
        if (g_loggedInUser) {
            return g_loggedInUser;
        }
        let resultPromise = new GetLoggedInUserCall().Call();
        let result = await resultPromise;
        if (result.loggedInUser) {
            g_loggedInUser = result.loggedInUser;
            return g_loggedInUser;
        }
        else
            return null;
    }
    exports.GetLoggedInUser = GetLoggedInUser;
    class GetLoggedInUserCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "GetLoggedInUser";
        }
    }
    exports.GetLoggedInUserCall = GetLoggedInUserCall;
    class GetLoggedInUserResponse extends RPC.Response {
        constructor() {
            super(...arguments);
            this.loggedInUser = null;
        }
    }
    exports.GetLoggedInUserResponse = GetLoggedInUserResponse;
    ////////////////////
    //Sign Up for a mailing list
    //////////////////
    async function SignUp(args) {
        return new SignUpCall(args).Call();
    }
    exports.SignUp = SignUp;
    class SignUpCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "SignUp";
            this.args = null;
            this.args = args;
        }
    }
    exports.SignUpCall = SignUpCall;
    ////////////////////
    //Set the logged in users notification email address
    //////////////////
    async function SetUserNotificationEmail(args) {
        return new SetUserNotificationEmailCall(args).Call();
    }
    exports.SetUserNotificationEmail = SetUserNotificationEmail;
    class SetUserNotificationEmailCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "SetUserNotificationEmail";
            this.args = null;
            this.args = args;
        }
    }
    exports.SetUserNotificationEmailCall = SetUserNotificationEmailCall;
    ////////////////////
    //Set the logged in users subscription message
    //////////////////
    async function SetUserSubscriptionMessage(args) {
        return new SetUserSubscriptionMessageCall(args).Call();
    }
    exports.SetUserSubscriptionMessage = SetUserSubscriptionMessage;
    class SetUserSubscriptionMessageCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "SetUserSubscriptionMessage";
            this.args = null;
            this.args = args;
        }
    }
    exports.SetUserSubscriptionMessageCall = SetUserSubscriptionMessageCall;
    ////////////////////
    //Cancel the logged in users account
    //////////////////
    async function CancelUserAccount() {
        return new CancelUserAccountCall().Call();
    }
    exports.CancelUserAccount = CancelUserAccount;
    class CancelUserAccountCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "CancelUserAccount";
        }
    }
    exports.CancelUserAccountCall = CancelUserAccountCall;
    /////////////////
    //Get info about a user based on their screen name
    ///////////////////
    async function GetUserByScreenName(args) {
        return new GetUserByScreenNameCall(args).Call();
    }
    exports.GetUserByScreenName = GetUserByScreenName;
    class GetUserByScreenNameCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "GetUserByScreenName";
            this.args = null;
            this.args = args;
        }
    }
    exports.GetUserByScreenNameCall = GetUserByScreenNameCall;
    class GetUserResponse extends RPC.Response {
    }
    exports.GetUserResponse = GetUserResponse;
    /////////////////
    //Get a complete list of all the emails that have signed up for a user
    ///////////////////
    async function GetUserSignUps() {
        return new GetUserSignUpsCall().Call();
    }
    exports.GetUserSignUps = GetUserSignUps;
    class GetUserSignUpsCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "GetUserSignUps";
        }
    }
    exports.GetUserSignUpsCall = GetUserSignUpsCall;
    class GetUserSignUpsResponse extends RPC.Response {
    }
    exports.GetUserSignUpsResponse = GetUserSignUpsResponse;
    /////////////////
    //Get stats about who has referred people for the sign ups
    ///////////////////
    async function GetReferralStats() {
        return new GetReferralStatsCall().Call();
    }
    exports.GetReferralStats = GetReferralStats;
    class GetReferralStatsCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "GetReferralStats";
        }
    }
    exports.GetReferralStatsCall = GetReferralStatsCall;
    class GetReferralStatsResponse extends RPC.Response {
    }
    exports.GetReferralStatsResponse = GetReferralStatsResponse;
});
define("Shared/HTTPRPCTransport", ["require", "exports", "Shared/RPC"], function (require, exports, RPC) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var g_logAll = true;
    if (g_logAll)
        console.log("HTTPRPCTransport logging all calls");
    let g_isBrowser = false;
    try {
        //if there is a global window object, we assume we're running in a browser
        let w = window;
        g_isBrowser = true;
    }
    catch (err) { }
    //HTTP allows clients (browsers) to make calls to servers, but not the other way around.
    //calling SetHandler from a browser or Call() from a server, will not work
    class HTTPRPCTransport extends RPC.Transport {
        constructor() {
            super();
            this.callHandlers = new Map();
        }
        //setup a function to handle a particular incoming json call
        SetHandler(className, func) {
            if (g_isBrowser) {
                console.log("HTTPRPCTransport.SetHandler can't be used from a browser");
                return;
            }
            //have to temporarily instantiate a call to get its method
            //little inefficient but better to do this way for type safety
            let tempInstance = new className();
            this.callHandlers.set(tempInstance.method, func);
        }
        async HandleIncomingCall(json, profile) {
            if (g_logAll)
                console.log('IncomingCall: ' + JSON.stringify(json));
            var handler = this.callHandlers.get(json.method);
            if (!handler) {
                console.log("HandleIncomingCall - no handler for method: " + json.method);
                return { success: false, error: RPC.Error.InvalidMethod, sequence: json.sequence };
            }
            try {
                return handler(json, profile);
            }
            catch (err) {
                console.log("HandleIncomingCall - exception in handler");
                console.error(err);
                return { success: false, error: RPC.Error.Unknown, sequence: json.sequence };
            }
        }
        CallNoResponse(c, options) {
            if (!g_isBrowser) {
                console.log("HTTPRPCTransport.CallNoResponse can't be used by the server");
                return;
            }
            var log = g_logAll;
            if (options && options.log !== undefined)
                log = options.log === true;
            if (log)
                console.log('CallNoResponse: ' + JSON.stringify(c));
            var fetchParams = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(c.args)
            };
            try {
                fetch(`/api/${c.method}`, fetchParams);
            }
            catch (err) {
                console.log(`Error fetching api ${c.method}:`);
                console.error(err);
            }
        }
        async Call(c, options) {
            if (!g_isBrowser) {
                console.log("HTTPRPCTransport.Call can't be used by the server");
                return;
            }
            var log = g_logAll;
            if (options && options.log !== undefined)
                log = options.log === true;
            if (log)
                console.log('Call: ' + JSON.stringify(c));
            var fetchParams = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(c.args)
            };
            try {
                let result = await fetch(`/api/${c.method}`, fetchParams);
                let json = await result.json();
                if (g_logAll)
                    console.log('Response: ' + JSON.stringify(json));
                return json;
            }
            catch (err) {
                console.log(`Error fetching api ${c.method}:`);
                console.error(err);
                return { success: false };
            }
        }
    }
    exports.HTTPRPC = new HTTPRPCTransport();
});
define("Client/DOMSite", ["require", "exports", "Client/DOMComponent"], function (require, exports, DOMComponent_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PageMap {
        constructor(parent) {
            this.parent = parent;
            this.pageMap = null;
        }
        InitRoutes(json) {
            //destroy whatever pagemap is already around
            this.pageMap = new Map();
            var keys = Object.keys(json);
            for (var i = 0; i < keys.length; i++) {
                this.pageMap.set(keys[i], json[keys[i]]);
            }
        }
        GetPage(path) {
            if (!this.pageMap)
                return null;
            var ctor = this.pageMap.get(path);
            if (ctor)
                return new ctor(this.parent);
            else
                console.log(`DOMSite.GetPage - unrecognized path: ${path}`);
        }
    }
    ;
    class DOMSite extends DOMComponent_js_1.DOMComponent {
        constructor() {
            super(null);
            this.pageMap = new PageMap(this);
            this.currentPath = null;
            this.currentPage = null;
        }
        InitRoutes(map) {
            this.pageMap.InitRoutes(map);
        }
        GetCurrentRoute() {
            return { page: this.currentPage, path: this.currentPath };
        }
        async RouteTo(path, options) {
            if (!this.pageMap)
                return false;
            //default behavior is to call history.pushState for this new path
            //so that it gets added to the back/forward browser history.
            //
            //when reacting to a user click of forward/back, however, we 
            //simply want to navigate and not push. thats why this option exists,
            //to prevent pushing in that case. there may be other use cases (??)
            var pushState = options ? options.pushState : true;
            try {
                if (this.currentPath === path) {
                    //we're already there, we're done
                    return true;
                }
                var p = this.pageMap.GetPage(path);
                if (p) {
                    if (this.currentPage) {
                        this.currentPage.RenderCleanup();
                    }
                    this.currentPath = path;
                    this.currentPage = p;
                    this.ClearModalComponent();
                    this.ClosePopupComponent();
                    //we have to push the routing to this path before calling
                    //render because render itslef may, as a result of logic checks,
                    //redirect us to some other route
                    if (pushState)
                        history.pushState({ path: path }, '', path);
                    await p.Render(this.GetRouteContentElement());
                    return true;
                }
                else {
                    console.log(`RouteTo - route does not exist: ${path}`);
                }
            }
            catch (err) {
                console.log("RouteTo error:");
                console.error(err);
            }
            return false;
        }
    }
    exports.DOMSite = DOMSite;
});
define("Client/DOMComponent", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class DOMPopupHandle {
        constructor() {
            this.handle = 'popup_' + DOMPopupHandle.count;
            DOMPopupHandle.count++;
        }
    }
    exports.DOMPopupHandle = DOMPopupHandle;
    DOMPopupHandle.count = 0;
    class DOMComponent {
        constructor(parent) {
            this.parent = parent;
            if (parent)
                this.site = parent.GetSite();
            else
                this.site = null;
        }
        GetSite() {
            return this.site;
        }
        //any listeners or watches or other external references that were established during Render
        //should be cleaned up here
        async RenderCleanup() { }
        MapEvent(parentElement, id, eventName, memberFunction) {
            try {
                parentElement.querySelector(`#${id}`).addEventListener(`${eventName}`, memberFunction.bind(this));
            }
            catch (err) {
                console.log(`MapEvent error - name: "${err.name}" message: "${err.message}`);
                console.error(err);
            }
        }
        DisplayPopupComponent(x, y, component) {
            var h = new DOMPopupHandle();
            var parent_handle = h.handle;
            var content_handle = h.handle + '_content';
            var html = `
            <div style="position:absolute; left:${x}px; top:${y}px; box-shadow: 0 1px 1px #0000, 0 0px 2px;">
                <div id=${content_handle}></div>
            </div>`;
            var newDiv = document.createElement('div');
            newDiv.id = parent_handle;
            newDiv.innerHTML = html;
            var renderDiv = newDiv.querySelector(`#${content_handle}`);
            component.Render(renderDiv);
            //we have a root level div wherein all popups are kept
            var popupModal = document.getElementById("popup-modal");
            popupModal.appendChild(newDiv);
            popupModal.style.display = 'block';
            // When the user clicks anywhere outside of the modal, close it
            var checkOutsideClick = function (event) {
                //allow clicks within the popup, clicks outside will close it
                if (event.target == popupModal) {
                    popupModal.removeChild(newDiv);
                    component.RenderCleanup();
                    window.removeEventListener("click", checkOutsideClick);
                    popupModal.style.display = 'none';
                }
            };
            window.addEventListener("click", checkOutsideClick);
            return h;
        }
        ClosePopupComponent(h) {
            var popupModal = document.getElementById("popup-modal");
            if (!popupModal)
                return;
            if (h) {
                var em = popupModal.querySelector(`#${h.handle}`);
                if (em) {
                    popupModal.removeChild(em);
                    popupModal.style.display = 'none';
                }
            }
            else {
                popupModal.innerHTML = ""; //remove all children
                popupModal.style.display = 'none';
            }
        }
        DisplayModalMessage(message) {
            this.DisplayModalComponent(new StringMessageComponent(this, message));
        }
        //same as DisplayModalMessage except shows an 'ok' and 'cancel' button
        //resolves with true if they click ok, false if they click cancel or click outside the content
        async DisplayModalConfirm(message) {
            var modal = document.getElementById('modal');
            var modalContent = document.getElementById('modal-content');
            let confirmComponent = new ConfirmComponent(this, message);
            //await the render so we are sure that it's .promise and .promiseResolve are accessible here
            await confirmComponent.Render(modalContent);
            modal.style.display = "flex";
            // When the user clicks anywhere outside of the modal, close it
            var checkOutsideClick = function (event) {
                //'modal' is effectively a page-covering background behind the modal content
                //which will catch any attemps to click anywhere other than the modal content
                //if they do that, the modal dialog cancels out
                if (event.target == modal) {
                    modalContent.innerHTML = '';
                    confirmComponent.promiseResolve(false); //clicking outside is the same as clicking cancel
                    confirmComponent.RenderCleanup();
                    modal.style.display = "none";
                    window.removeEventListener("click", checkOutsideClick);
                }
            };
            window.addEventListener("click", checkOutsideClick);
            //this promise returned from the confirmcomponent gets resolved
            //when ok is clicked, cancel is clicked, or right above here if they click
            //outside the modal content
            return confirmComponent.promise;
        }
        DisplayModalComponent(component) {
            var modal = document.getElementById('modal');
            var modalContent = document.getElementById('modal-content');
            component.Render(modalContent);
            modal.style.display = "flex";
            // When the user clicks anywhere outside of the modal, close it
            var checkOutsideClick = function (event) {
                //'modal' is effectively a page-covering background behind the modal content
                //which will catch any attemps to click anywhere other than the modal content
                //if they do that, the modal dialog cancels out
                if (event.target == modal) {
                    modalContent.innerHTML = '';
                    component.RenderCleanup();
                    modal.style.display = "none";
                    window.removeEventListener("click", checkOutsideClick);
                }
            };
            window.addEventListener("click", checkOutsideClick);
        }
        ClearModalComponent() {
            var modal = document.getElementById('modal');
            var modalContent = document.getElementById('modal-content');
            if (modalContent)
                modalContent.innerHTML = '';
            if (modal)
                modal.style.display = "none";
        }
    }
    exports.DOMComponent = DOMComponent;
    class StringMessageComponent extends DOMComponent {
        constructor(parent, message) {
            super(parent);
            this.message = message;
        }
        async Render(em) {
            em.innerHTML = this.message;
        }
    }
    class ConfirmComponent extends DOMComponent {
        constructor(parent, message) {
            super(parent);
            this.promise = null;
            this.promiseResolve = null;
            this.message = message;
        }
        async Render(em) {
            this.promise = new Promise((resolve, reject) => {
                //we have to save this resolve function so it can be accessed outside the component
                //by DisplayConfirmComponent, which catches clicks outside the modal content area
                //and resolves(false)
                this.promiseResolve = resolve;
                em.innerHTML =
                    `${this.message}<br/><br/>
                <div style="display:flex; justify-content:flex-end">
                    <button id="ok" style="margin-right: 12px">OK</button><button id="cancel">Cancel</button>
                </div>`;
                em.querySelector('#ok').addEventListener('click', () => {
                    this.ClearModalComponent();
                    resolve(true);
                });
                em.querySelector('#cancel').addEventListener('click', () => {
                    this.ClearModalComponent();
                    resolve(false);
                });
            });
        }
    }
});
define("Client/SignUpPage", ["require", "exports", "Shared/ServerApi", "Client/DOMComponent"], function (require, exports, ServerApi, DOMComponent_js_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ValidateEmailAddress(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (re.test(email))
            return true;
        return false;
    }
    function GetDefaultMessage(name) {
        return `Hi, I'm ${name}. Would you like to subscribe to my newsletter?`;
    }
    exports.GetDefaultMessage = GetDefaultMessage;
    class SignUpPage extends DOMComponent_js_2.DOMComponent {
        constructor(parent, userInfo, referrer) {
            super(parent);
            this.emailInput = null;
            this.signUpButton = null;
            this.signUpResult = null;
            //whoever referred us to this sign up page
            this.referrer = null;
            this.SignUp = async () => {
                let email = this.emailInput.value;
                if (!ValidateEmailAddress(email)) {
                    this.DisplayModalMessage("Please enter a valid email address.");
                    return;
                }
                this.signUpButton.disabled = true;
                let setResult = (str) => {
                    this.signUpResult.innerHTML = `<br/>${str}`;
                };
                let signUpResult = await ServerApi.SignUp({ owner_id_str: this.userInfo.id_str, email: email, referrer_screen_name: this.referrer });
                if (signUpResult.success)
                    setResult(`Thanks, you should be hearing from ${this.userInfo.screen_name} soon!`);
                else
                    setResult('Sorry, something went wrong. Please try again later.');
            };
            this.userInfo = userInfo;
            this.referrer = referrer;
        }
        async Render(em) {
            let message = GetDefaultMessage(this.userInfo.name);
            if (this.userInfo.subscription_message)
                message = this.userInfo.subscription_message;
            let imageUrl = this.userInfo.profile_image_url;
            //get the bigger version
            imageUrl = imageUrl.replace('_normal', '');
            let w = 144 / window.devicePixelRatio;
            let h = 144 / window.devicePixelRatio;
            em.innerHTML =
                `<div class="subscriptionBackground">
            <div style="margin:auto; border-radius: 6px; box-shadow: #bcbcbc 0px 0px 11px; padding: 30px 30px; background-color: #fff; max-width:400px">
                <div style="display:flex; justify-content:center; align-items: center">
                    <img src="${imageUrl}" style="vertical-align:middle; width:${w}px; height:${h}px; border-radius:${w}px">
                    <span style="vertical-align:middle; margin-left:16px;">${message}</span>
                </div>
                <br/><br />
                <center>
                <input id="email" style="width:220px;" type="text" placeholder="Enter your email address">
                <button id="signUpButton" style="margin-left:4px">Sign Up</button>
                <div id="signUpResult"></div>
                </center>
            </div>
            </div>
                <div class="subscriptionLogoDiv"><a href="/"><img class="subscriptionLogoImg" src="/flybird.png"></a></div>
`;
            this.signUpButton = em.querySelector('#signUpButton');
            this.emailInput = em.querySelector('#email');
            this.signUpResult = em.querySelector('#signUpResult');
            this.MapEvent(em, 'signUpButton', 'click', this.SignUp);
        }
        async RenderCleanup() {
        }
    }
    exports.SignUpPage = SignUpPage;
});
define("Client/HomePage", ["require", "exports", "Shared/ServerApi", "Client/DOMComponent", "Client/SignUpPage"], function (require, exports, ServerApi, DOMComponent_js_3, SignUpPage_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ValidateEmailAddress(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (re.test(email))
            return true;
        return false;
    }
    class HomePage extends DOMComponent_js_3.DOMComponent {
        constructor() {
            super(...arguments);
            this.emailInput = null;
            this.emailResult = null;
            this.messageInput = null;
            this.messageResult = null;
            this.cancelResult = null;
            this.userInfo = null;
            this.SetEmail = async () => {
                let email = this.emailInput.value;
                if (!ValidateEmailAddress(email)) {
                    this.DisplayModalMessage("Please enter a valid email address.");
                    return;
                }
                let json = await ServerApi.SetUserNotificationEmail({ email: email });
                let setResult = (str) => {
                    this.emailResult.innerHTML = `<br/><br/>${str}`;
                };
                var linkPath = `/${this.userInfo.screen_name}`;
                var fullLink = `https://itk-signup.herokuapp.com/${this.userInfo.screen_name}`;
                if (json.success === true)
                    setResult(`Thanks! Direct potential subscribers here:<br /><br /><a href="${linkPath}">${fullLink}</a><br/><br/>When someone signs up, you will receive an email at the address you provided above. Good luck!`);
                else
                    setResult('Sorry, something went wrong. Please try again later.');
            };
            this.SetMessage = async () => {
                let message = this.messageInput.value;
                let json = await ServerApi.SetUserSubscriptionMessage({ message: message });
                let setResult = (str) => {
                    this.messageResult.innerHTML = `${str}`;
                };
                if (json.success === true) {
                    setResult(`Message saved!`);
                    setTimeout(() => { setResult(''); }, 2000);
                }
                else
                    setResult('Sorry, something went wrong. Please try again later.');
            };
            this.Cancel = async () => {
                let json = await ServerApi.CancelUserAccount();
                let setResult = (str) => {
                    this.cancelResult.innerHTML = `<Br/><br/>${str}`;
                };
                if (json.success === true)
                    setResult('Sorry to see you go. You can reactivate at any time by submitting your email address above.');
                else
                    setResult('Sorry, something went wrong. Please try again later.');
            };
            this.Export = async () => {
                let json = await ServerApi.GetUserSignUps();
                if (!json.success) {
                    this.DisplayModalMessage("Export failed. Please try again later.");
                    return;
                }
                let csv = '';
                for (var i = 0; i < json.signUps.length; i++) {
                    csv += `${json.signUps[i].email}\n`;
                }
                console.log(csv);
                var hiddenElement = document.createElement('a');
                hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
                hiddenElement.target = '_blank';
                hiddenElement.download = 'subscribers.csv';
                hiddenElement.click();
            };
        }
        async Render(em) {
            let loggedInUser = await ServerApi.GetLoggedInUser();
            if (!loggedInUser)
                return;
            this.userInfo = await ServerApi.GetUserByScreenName({ screen_name: loggedInUser.screen_name });
            if (!this.userInfo)
                return;
            //if they already have set an email address on their account,
            //include a 'value=' attribute in the <input > we declare below so that the field's value is
            //pre-set to their existing email address
            let valueEqualsEmail = '';
            if (this.userInfo.email) {
                //if they have already stored an email, pre fill the input field with it
                valueEqualsEmail = `value=\"${this.userInfo.email}\"`;
            }
            let message = SignUpPage_js_1.GetDefaultMessage(loggedInUser.name);
            if (this.userInfo.subscription_message)
                message = this.userInfo.subscription_message;
            //the link they will direct potential subscribers to once they set their email address..
            em.innerHTML =
                `<div style="max-width:560px">
            <div class="section">
                What message would you like to show on your subscription page?<br/><br/>
                <textarea id="message" style="box-sizing: border-box; width:100%; height:96px">${message}</textarea>
                <div style="display:flex; justify-content:flex-start; align-items: center">
                    <button id="setMessageButton"}>Save</button><span id="messageResult" style="margin-left:4px"></span>
                    <div style="flex-grow:1; text-align:right">
                        <button onclick="window.open('subscribe/${this.userInfo.screen_name}','_blank')">View Your Subscription Page</button>
                    </div>
                </div>
            </div>
            <div class="section" style="margin-top: 16px">
                Share your email address and we'll notify you when people sign up.<br /><br />
                <input id="email" style="width:220px" type="text" placeholder="Enter your email address" ${valueEqualsEmail}>
                <br/><br/>
                <button id="setEmailButton">Save</button>
                <div id="emailResult">
                </div>
            </div>
            <div class="section" style="margin-top: 16px">
                Want a list of all your subscribers?
                <br/><br/>
                <button id="exportButton">Export Subscriber List</button>
            </div>
            <div class="section" style="margin-top: 16px">
                Don't want your subscription page anymore?
                <br/><Br/>
                <button id="cancelButton">Deactivate Account</button>
                <div id="cancelResult">
                </div>
            </div>
            </div>`;
            this.emailInput = em.querySelector('#email');
            this.emailResult = em.querySelector('#emailResult');
            this.messageInput = em.querySelector('#message');
            this.messageResult = em.querySelector('#messageResult');
            this.cancelResult = em.querySelector('#cancelResult');
            this.MapEvent(em, 'exportButton', 'click', this.Export);
            this.MapEvent(em, 'cancelButton', 'click', this.Cancel);
            this.MapEvent(em, 'setEmailButton', 'click', this.SetEmail);
            this.MapEvent(em, 'setMessageButton', 'click', this.SetMessage);
        }
        async RenderCleanup() {
        }
    }
    exports.HomePage = HomePage;
});
define("Client/LoginPage", ["require", "exports", "Client/DOMComponent"], function (require, exports, DOMComponent_js_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LoginPage extends DOMComponent_js_4.DOMComponent {
        async Render(em) {
            let tw = 40 / window.devicePixelRatio;
            let th = 34 / window.devicePixelRatio;
            let fw = 512 / window.devicePixelRatio;
            let fh = 420 / window.devicePixelRatio;
            em.innerHTML =
                `<div style="position:fixed; left:0; top:0; width:100vw; height:100vh; display:flex; background-color: #dce3e9">
            <div style="margin:auto; border-radius: 6px; box-shadow: #bcbcbc 0px 0px 11px; padding: 30px 34px 30px 34px; background-color: #fff">
                <div style="display:flex; justify-content:center; align-items:center">
                    <img style="width:${fw}px; height:${fh}px" src="flybird.png">
                    <span class="logoSpan">Flybird</span>
                </div>
                <div style="text-align:center">
                    <br/>
                    Want to boost subscriptions to to your newsletter?<br/><br/><br/>We can help. Let's get started!<br/><br/><br/>
                    <div class="divButton" onclick="window.location='/auth/twitter'" style="padding: 9px 15px; box-shadow: 0 0 2px #000">
                        <div style="display:flex; align-items:center">
                            <img src="twitter-button.png" style="margin-right: 6px; width:${tw}px; height:${th}px"><span>Sign in with Twitter</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }
        async RenderCleanup() {
        }
    }
    exports.LoginPage = LoginPage;
});
define("Client/ReferralsPage", ["require", "exports", "Shared/ServerApi", "Client/DOMComponent"], function (require, exports, ServerApi, DOMComponent_js_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ReferralsPage extends DOMComponent_js_5.DOMComponent {
        constructor() {
            super(...arguments);
            this.referralsDiv = null;
        }
        async Render(em) {
            let json = await ServerApi.GetReferralStats();
            em.innerHTML =
                `<div style="width:560px">
            <div class="section">
                <div style="display:inline-block; margin-bottom:12px; font-size:26px;">Leaderboard</div>
                <div id="referralsDiv"></div>
            </div>`;
            this.referralsDiv = em.querySelector('#referralsDiv');
            if (!json.success || json.referrals.length <= 0) {
                this.referralsDiv.innerHTML = "No one has referred any subscribers yet.";
                return;
            }
            let html = `<div class="referrerHeaderRow">
                <div class="referrerIcon">&nbsp</div>
                <div class="referrerName">Name</div>
                <div class="referrerScreenName">Twitter Handle</div>
                <div class="referrerTotal">Total Referrals</div>
            </div>`;
            for (var i = 0; i < json.referrals.length; i++) {
                let r = json.referrals[i];
                let imgUrl = r.profile_image_url;
                if (!imgUrl)
                    imgUrl = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
                html +=
                    `<div class="referrerRow" onclick="window.open('https://twitter.com/${r.screen_name}', '_blank')">
                <div class="referrerIcon"><img class="referrerIconImg" src="${imgUrl}"></div>
                <div class="referrerName">${r.name}</div>
                <div class="referrerScreenName">${r.screen_name}</div>
                <div class="referrerTotal">${r.total}</div>
            </div>`;
            }
            this.referralsDiv.innerHTML = html;
        }
        async RenderCleanup() {
        }
    }
    exports.ReferralsPage = ReferralsPage;
});
define("Client/Site", ["require", "exports", "Shared/RPC", "Shared/ServerApi", "Shared/HTTPRPCTransport", "Client/DOMSite", "Client/HomePage", "Client/LoginPage", "Client/SignUpPage", "Client/ReferralsPage"], function (require, exports, RPC, ServerApi, HTTPRPCTransport_js_1, DOMSite_js_1, HomePage_js_1, LoginPage_js_1, SignUpPage_js_2, ReferralsPage_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Site extends DOMSite_js_1.DOMSite {
        constructor() {
            super();
            this.loggedInUser = null;
            this.Logout = () => {
                window.location.href = '/logout';
            };
            if (Site.g_site) {
                console.log("Site.g_site already exists, should never have multiple Site instantiations");
                return;
            }
            Site.g_site = this;
            this.routerContentElement = null;
            var map = {
                "/login": LoginPage_js_1.LoginPage,
                "/referrals": ReferralsPage_js_1.ReferralsPage,
                "/": HomePage_js_1.HomePage
            };
            this.InitRoutes(map);
            window.addEventListener('popstate', (event) => {
                //console.log(inspect(event));
                this.RouteTo(event.state.path, { pushState: false });
            }, false);
        }
        static GetSite() {
            return Site.g_site;
        }
        GetSite() {
            return this;
        }
        GetRouteContentElement() {
            return this.routerContentElement;
        }
        AttachEmptyRouter(em) {
            em.innerHTML = '<div id="routerContentId"></div>';
            this.routerContentElement = em.querySelector('#routerContentId');
        }
        AttachDefaultRouter(em) {
            //apply the title bar and router content div
            let profile_image_url = this.loggedInUser.profile_image_url;
            em.innerHTML =
                `<div style="display:flex; justify-content:centered; align-items:flex-start; margin-top:16px">
                <div style="display:inline-block;">
                    <div class="dock">
                            <div id="subscriptionsDiv" class="dockItemDiv"><img class="dockItemImg" style="border-radius:0px" src="flybird_dock_icon.png"><span class="dockItemTitle">Subscriptions</span></div>
                            <div id="referralsDiv" class="dockItemDiv"><img class="dockItemImg" src="/followers_icon.png"><span class="dockItemTitle">Referrals</span></div>
                            <div id="logoutDiv" class="dockItemDiv"><img class="dockItemImg" src="${profile_image_url}"><span class="dockItemTitle">Log Out</span></div>
                    </div>
                </div>
                <div style="display:inline-block; flex-grow:1">
                    <div style="display:flex; justify-content:center">
                        <div style="display:inline-block; margin-left:4px; margin-right:4px" id="routerContentId"></div>
                    </div>
                </div>
            </div>
            `;
            this.MapEvent(em, 'logoutDiv', 'click', this.Logout);
            this.MapEvent(em, 'referralsDiv', 'click', () => this.RouteTo('/referrals'));
            this.MapEvent(em, 'subscriptionsDiv', 'click', () => this.RouteTo('/'));
            /*
                `<body style='font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size:15px;'>
                <div style="display:flex; justify-content:center">
                    <div style="display:inline; width:320px;"><img style="width:100%;height:auto" src="logo.png"></div>
                </div>
                <div style="display:flex; justify-content:center">
                    <div id="routerContentId"></div>
                </div>
                </body>`;
                */
            this.routerContentElement = em.querySelector('#routerContentId');
        }
        async Render(em) {
            try {
                //detect a request for a sign up page (no login required)
                let prefix = '/subscribe/';
                if (window.location.pathname.startsWith(prefix)) {
                    let screen_name = window.location.pathname.substr(prefix.length);
                    let getUserResponse = await ServerApi.GetUserByScreenName({ screen_name: screen_name });
                    if (!getUserResponse || !getUserResponse.has_sign_up_page) {
                        this.AttachEmptyRouter(em);
                        this.routerContentElement.innerHTML = `No sign up page exists for ${screen_name}, sorry.`;
                        return;
                    }
                    //pull the referrer out
                    let referrer = '';
                    try {
                        var params = new URLSearchParams(window.location.search);
                        referrer = params.get('twRef');
                    }
                    catch (err) { }
                    let signUpPage = new SignUpPage_js_2.SignUpPage(this, getUserResponse, referrer);
                    signUpPage.Render(em);
                    return;
                }
                //make sure we're logged in
                this.loggedInUser = await ServerApi.GetLoggedInUser();
                //if we're not logged in, take them to the login page
                if (!this.loggedInUser) {
                    //render the login page
                    this.AttachEmptyRouter(em);
                    this.RouteTo("/login");
                    return;
                }
                this.AttachDefaultRouter(em);
                let routeOk = await this.RouteTo(window.location.pathname);
                if (!routeOk) {
                    //default route, go to / (home page)
                    this.RouteTo("/");
                }
            }
            catch (err) {
                console.log("error");
            }
        }
        async onload() {
            RPC.SetTransport(HTTPRPCTransport_js_1.HTTPRPC);
            this.Render(document.getElementById("site"));
        }
    }
    exports.Site = Site;
    Site.g_site = null;
});
//# sourceMappingURL=Client.js.map