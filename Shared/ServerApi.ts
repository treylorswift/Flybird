import * as RPC from './RPC';
import * as TwitterAuth from './TwitterAuth';


//////////////////////
//GetLoggedInUser looks at existing/current session
//and returns info about who is currently logged in
/////////////////////

export type LoggedInUser =
{
    screen_name:string //twitter handle
    id_str:string //twitter identifier string
    name:string //their displayable full name
    profile_image_url:string //their profile image
}

let g_loggedInUser:LoggedInUser = null;

export async function GetLoggedInUser():Promise<LoggedInUser>
{
    if (g_loggedInUser)
    {
        return g_loggedInUser;
    }

    let resultPromise = new GetLoggedInUserCall().Call() as Promise<GetLoggedInUserResponse>;
    let result = await resultPromise;
    if (result.loggedInUser)
    {
        g_loggedInUser = result.loggedInUser;
        return g_loggedInUser;
    }
    else
        return null;
}

export class GetLoggedInUserCall extends RPC.Call
{
    method = "GetLoggedInUser"
}

export class GetLoggedInUserResponse extends RPC.Response
{
    loggedInUser:LoggedInUser = null;
}

////////////////////
//Initiate Login Oauth Flow
//////////////////

export async function Login():Promise<LoginResponse>
{
    return new LoginCall().Call() as Promise<LoginResponse>;
}

export class LoginCall extends RPC.Call
{
    method = "Login"
}

export class LoginResponse extends RPC.Response
{
    loggedInUser:LoggedInUser;
}


////////////////////
//Sign Up for a mailing list
//////////////////

export async function SignUp(args:SignUpCall["args"]):Promise<RPC.Response>
{
    return new SignUpCall(args).Call() as Promise<RPC.Response>;
}

export class SignUpCall extends RPC.Call
{
    method = "SignUp"
    
    constructor(args:SignUpCall["args"])
    {
        super();
        this.args = args;
    }

    args:{
        owner_id_str:string //the twitter id of the owner of the newsletter being signed up for
        email:string //the email address that is being signed up
        referrer_screen_name:string //the twitter user who receives credit for the sign up 
    } = null;
}


////////////////////
//Set the logged in users notification email address
//////////////////

export async function SetUserNotificationEmail(args:SetUserNotificationEmailCall["args"]):Promise<RPC.Response>
{
    return new SetUserNotificationEmailCall(args).Call() as Promise<RPC.Response>;
}

export class SetUserNotificationEmailCall extends RPC.Call
{
    method = "SetUserNotificationEmail"
    
    constructor(args:SetUserNotificationEmailCall["args"])
    {
        super();
        this.args = args;
    }

    args:{
        email:string //the email address that is being signed up
    } = null;
}


////////////////////
//Set the logged in users subscription message
//////////////////

export async function SetUserSubscriptionMessage(args:SetUserSubscriptionMessageCall["args"]):Promise<RPC.Response>
{
    return new SetUserSubscriptionMessageCall(args).Call() as Promise<RPC.Response>;
}

export class SetUserSubscriptionMessageCall extends RPC.Call
{
    method = "SetUserSubscriptionMessage"
    
    constructor(args:SetUserSubscriptionMessageCall["args"])
    {
        super();
        this.args = args;
    }

    args:{
        message:string //the message to show on their subscription page
    } = null;
}

////////////////////
//Cancel the logged in users account
//////////////////

export async function CancelUserAccount():Promise<RPC.Response>
{
    return new CancelUserAccountCall().Call() as Promise<RPC.Response>;
}

export class CancelUserAccountCall extends RPC.Call
{
    method = "CancelUserAccount"
}

/////////////////
//Get info about a user based on their screen name
///////////////////

export async function GetUserByScreenName(args:GetUserByScreenNameCall["args"]):Promise<GetUserResponse>
{
    return new GetUserByScreenNameCall(args).Call() as Promise<GetUserResponse>;
}

export class GetUserByScreenNameCall extends RPC.Call
{
    method = "GetUserByScreenName"
    
    constructor(args:GetUserByScreenNameCall["args"])
    {
        super();
        this.args = args;
    }

    args:
    {
        screen_name:string //the user being looked up
    } = null;
}

export class GetUserResponse extends RPC.Response
{
    //returns true if the user has a sign up page
    has_sign_up_page:boolean;

    //the message to display on their subscription page
    subscription_message:string;

    //the identifier string for the user
    id_str:string;

    //their screen name
    screen_name:string;

    //their normal name / display name
    name: string;

    //their profile photo
    profile_image_url:string;

    //the email the user has specified for their account - will only be filled in
    //if the logged in user is requesting their own info
    email:string;
}


/////////////////
//Get a complete list of all the emails that have signed up for a user
///////////////////

export async function GetUserSignUps():Promise<GetUserSignUpsResponse>
{
    return new GetUserSignUpsCall().Call() as Promise<GetUserSignUpsResponse>;
}

export class GetUserSignUpsCall extends RPC.Call
{
    method = "GetUserSignUps"
    
    args:{};
}

export class GetUserSignUpsResponse extends RPC.Response
{
    signUps:Array<{email:string,referrer:string}>;
}
