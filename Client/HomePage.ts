import * as ServerApi from "../Shared/ServerApi.js"
import { DOMComponent } from "./DOMComponent.js"
import {GetDefaultMessage} from "./SignUpPage.js"

function ValidateEmailAddress(email) 
{
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (re.test(email))
        return true;

    return false;
}



export class HomePage extends DOMComponent
{
    emailInput:HTMLInputElement = null;
    emailResult:HTMLElement = null;
    
    messageInput:HTMLInputElement = null;
    messageResult:HTMLElement = null;

    cancelResult:HTMLElement = null;
    userInfo:ServerApi.GetUserResponse = null;

    SetEmail = async () =>
    {
        let email = this.emailInput.value;
        if (!ValidateEmailAddress(email))
        {
            this.DisplayModalMessage("Please enter a valid email address.");
            return;
        }

        let json = await ServerApi.SetUserNotificationEmail({email:email});

        let setResult = (str)=>
        {
            this.emailResult.innerHTML = `<br/><br/>${str}`;
        }

        var linkPath = `/subscribe/${this.userInfo.screen_name}`
        var fullLink = `https://flybirdy.herokuapp.com/subscribe/${this.userInfo.screen_name}`

        if (json.success===true)
            this.DisplayModalMessage(`Thanks! Direct potential subscribers here:<br /><br /><a href="${linkPath}" target="_blank">${fullLink}</a><br/><br/>When someone signs up, you will receive an email at the address you provided above. Good luck!`);
        else
            this.DisplayModalMessage('Sorry, something went wrong. Please try again later.');

    }

    SetMessage = async () =>
    {
        let message = this.messageInput.value;

        let json = await ServerApi.SetUserSubscriptionMessage({message:message});

        let setResult = (str)=>
        {
            this.messageResult.innerHTML = `${str}`;
        }


        if (json.success===true)
        {
            setResult(`Message saved!`);
            setTimeout(()=>{setResult('');}, 2000);
        }
        else
            setResult('Sorry, something went wrong. Please try again later.');

    }

    Cancel = async () =>
    {
        let json = await ServerApi.CancelUserAccount();

        let setResult = (str)=>
        {
            this.cancelResult.innerHTML = `<Br/><br/>${str}`;
        }

        if (json.success===true)
            setResult('Sorry to see you go. You can reactivate at any time by submitting your email address above.');
        else
            setResult('Sorry, something went wrong. Please try again later.');
    }

    Export = async () =>
    {
        let json = await ServerApi.GetUserSignUps();
        if (!json.success)
        {
            this.DisplayModalMessage("Export failed. Please try again later.");
            return;
        }

        let csv = '';

        for (var i=0; i<json.signUps.length; i++)
        {
            csv += `${json.signUps[i].email}\n`;
        }
 
        console.log(csv);
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'subscribers.csv';
        hiddenElement.click();
    }

    async Render(em:Element)
    {
        let loggedInUser = await ServerApi.GetLoggedInUser();
        if (!loggedInUser)
            return;
        
        this.userInfo = await ServerApi.GetUserByScreenName({screen_name: loggedInUser.screen_name});
        if (!this.userInfo)
            return;

        //if they already have set an email address on their account,
        //include a 'value=' attribute in the <input > we declare below so that the field's value is
        //pre-set to their existing email address
        let valueEqualsEmail = ''

        if (this.userInfo.email)
        {
            //if they have already stored an email, pre fill the input field with it
            valueEqualsEmail = `value=\"${this.userInfo.email}\"`;
        }

        let message = GetDefaultMessage(loggedInUser.name);
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

        this.MapEvent(em,'exportButton','click',this.Export);
        this.MapEvent(em,'cancelButton','click',this.Cancel);
        this.MapEvent(em,'setEmailButton','click',this.SetEmail);
        this.MapEvent(em,'setMessageButton','click',this.SetMessage);
    }

    async RenderCleanup()
    {
    }

}

