import * as ServerApi from "../Shared/ServerApi.js"
import { DOMComponent } from "./DOMComponent.js"

export class LoginPage extends DOMComponent
{

    async Render(em:Element)
    {
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

    async RenderCleanup()
    {
    }
}

