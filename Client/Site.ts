import * as RPC from "../Shared/RPC.js"
import * as ServerApi from "../Shared/ServerApi.js"
import { HTTPRPC } from "../Shared/HTTPRPCTransport.js";
import { DOMComponent } from "./DOMComponent.js"
import { DOMSite } from "./DOMSite.js"
import { HomePage } from "./HomePage.js"
import { LoginPage } from "./LoginPage.js"
import { SignUpPage } from "./SignUpPage.js"

export class Site extends DOMSite
{
    routerContentElement:HTMLElement;
    loggedInUser:ServerApi.LoggedInUser = null;

    private static g_site:Site = null;
    static GetSite():Site
    {
        return Site.g_site;
    }

    constructor()
    {
        super();
        if (Site.g_site)
        {
            console.log("Site.g_site already exists, should never have multiple Site instantiations");
            return;
        }
        Site.g_site = this;

        this.routerContentElement = null;

        var map = 
        {
            "/login":LoginPage,
            "/":HomePage
        };

        this.InitRoutes(map);

        window.addEventListener('popstate', (event) =>
        {
            //console.log(inspect(event));
            this.RouteTo(event.state.path,{pushState:false});
        }, false);
    }

    GetSite():DOMSite
    {
        return this;
    }

    GetRouteContentElement():HTMLElement
    {
        return this.routerContentElement;
    }
    
    AttachEmptyRouter(em:HTMLElement)
    {
        em.innerHTML = '<div id="routerContentId"></div>';
        this.routerContentElement = em.querySelector('#routerContentId');   
    }

    AttachDefaultRouter(em:HTMLElement)
    {
        //apply the title bar and router content div
        let profile_image_url = this.loggedInUser.profile_image_url
        em.innerHTML =
           `<div style="display:flex; justify-content:centered; align-items:flex-start; margin-top:16px">
                <div style="display:inline-block;">
                    <div class="dock">
                            <div class="dockItemDiv"><img class="dockItemImg" style="border-radius:0px" src="flybird_dock_icon.png"><span class="dockItemTitle">Subscription Page</span></div>
                            <div class="dockItemDiv"><img class="dockItemImg" src="${profile_image_url}"></div>
                    </div>
                </div>
                <div style="display:inline-block; flex-grow:1">
                    <div style="display:flex; justify-content:center">
                        <div style="display:inline-block; margin-left:4px; margin-right:4px" id="routerContentId"></div>
                    </div>
                </div>
            </div>
            `;

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


    async Render(em:HTMLElement)
    {
        try
        {
            //detect a request for a sign up page (no login required)
            let prefix = '/subscribe/'
            if (window.location.pathname.startsWith(prefix))
            {
                let screen_name = window.location.pathname.substr(prefix.length);
                let getUserResponse = await ServerApi.GetUserByScreenName({screen_name:screen_name});
                
                if (!getUserResponse || !getUserResponse.has_sign_up_page)
                {
                    this.AttachEmptyRouter(em);
                    this.routerContentElement.innerHTML = `No sign up page exists for ${screen_name}, sorry.`;
                    return;
                }

                //pull the referrer out
                let referrer = ''
                try
                {
                    var params = new URLSearchParams(window.location.search);
                    referrer = params.get('twRef');
                } catch (err) {}

                let signUpPage = new SignUpPage(this, getUserResponse, referrer);
                signUpPage.Render(em);
                return;
            }

            //make sure we're logged in
            this.loggedInUser = await ServerApi.GetLoggedInUser();
            
            //if we're not logged in, take them to the login page
            if (!this.loggedInUser)
            {
                //render the login page
                this.AttachEmptyRouter(em);
                this.RouteTo("/login");
                return;
            }

            this.AttachDefaultRouter(em);

            //default route, go to / (home page)
            await this.RouteTo("/");
        }
        catch (err)
        {
            console.log("error");
        }
    }

    async onload()
    {
        RPC.SetTransport(HTTPRPC);

        this.Render(document.getElementById("site"));
    }

}

