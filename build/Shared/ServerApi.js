"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPC = require("./RPC");
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
//Initiate Login Oauth Flow
//////////////////
async function Login() {
    return new LoginCall().Call();
}
exports.Login = Login;
class LoginCall extends RPC.Call {
    constructor() {
        super(...arguments);
        this.method = "Login";
    }
}
exports.LoginCall = LoginCall;
class LoginResponse extends RPC.Response {
}
exports.LoginResponse = LoginResponse;
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
//# sourceMappingURL=ServerApi.js.map