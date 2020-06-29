import * as ServerApi from "../Shared/ServerApi.js"
import { DOMComponent } from "./DOMComponent.js"

function ValidateEmailAddress(email) 
{
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (re.test(email))
        return true;

    return false;
}

export function GetDefaultMessage(name:string)
{
    return `Hi, I'm ${name}. Would you like to subscribe to my newsletter?`;
   
}

export class SignUpPage extends DOMComponent
{
    emailInput:HTMLInputElement = null;
    signUpButton:HTMLButtonElement = null;
    signUpResult:HTMLElement = null;

    //whoever referred us to this sign up page
    referrer:string = null;

    //the owner of the list we're signing up to
    userInfo:ServerApi.GetUserResponse;

    constructor(parent:DOMComponent, userInfo:ServerApi.GetUserResponse, referrer:string)
    {
        super(parent);
        this.userInfo = userInfo;
        this.referrer = referrer;
    }

    SignUp = async () =>
    {
        let email = this.emailInput.value;
        if (!ValidateEmailAddress(email))
        {
            this.DisplayModalMessage("Please enter a valid email address.");
            return;
        }

        this.signUpButton.disabled = true;

        let setResult = (str)=>
        {
            this.signUpResult.innerHTML = `<br/>${str}`;
        }

        let signUpResult = await ServerApi.SignUp({owner_id_str:this.userInfo.id_str, email:email, referrer_screen_name:this.referrer});
        if (signUpResult.success)
            setResult(`Thanks, you should be hearing from ${this.userInfo.screen_name} soon!`);
        else
            setResult('Sorry, something went wrong. Please try again later.');
    }

    async Render(em:Element)
    {
        let message = GetDefaultMessage(this.userInfo.name);
        if (this.userInfo.subscription_message)
            message = this.userInfo.subscription_message;

        let imageUrl = this.userInfo.profile_image_url;
        //get the bigger version
        imageUrl = imageUrl.replace('_normal','');

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

    async RenderCleanup()
    {
    }
}

