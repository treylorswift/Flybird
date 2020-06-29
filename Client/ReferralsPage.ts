import * as ServerApi from "../Shared/ServerApi.js"
import { DOMComponent } from "./DOMComponent.js"

export class ReferralsPage extends DOMComponent
{
    referralsDiv:HTMLElement = null;
 
    async Render(em:Element)
    {
        let json = await ServerApi.GetReferralStats();

        em.innerHTML = 
           `<div style="width:560px">
            <div class="section">
                <div style="display:inline-block; margin-bottom:12px; font-size:26px;">Leaderboard</div>
                <div id="referralsDiv"></div>
            </div>`;
            
        this.referralsDiv = em.querySelector('#referralsDiv');

        if (!json.success || json.referrals.length<=0)
        {
            this.referralsDiv.innerHTML = "No one has referred any subscribers yet."
            return;
        }

        let html =
           `<div class="referrerHeaderRow">
                <div class="referrerIcon">&nbsp</div>
                <div class="referrerName">Name</div>
                <div class="referrerScreenName">Twitter Handle</div>
                <div class="referrerTotal">Total Referrals</div>
            </div>`

        for (var i=0; i<json.referrals.length; i++)
        {
            let r = json.referrals[i];

            let imgUrl = r.profile_image_url;
            if (!imgUrl)
                imgUrl = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"

            html += 
            `<div class="referrerRow" onclick="window.open('https://twitter.com/${r.screen_name}', '_blank')">
                <div class="referrerIcon"><img class="referrerIconImg" src="${imgUrl}"></div>
                <div class="referrerName">${r.name}</div>
                <div class="referrerScreenName">${r.screen_name}</div>
                <div class="referrerTotal">${r.total}</div>
            </div>`
        }
 
        this.referralsDiv.innerHTML = html;
    }

    async RenderCleanup()
    {
    }

}

