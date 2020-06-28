import { DOMComponent, DOMComponentConstructor } from "./DOMComponent.js"

class PageMap
{
    pageMap:Map<string,DOMComponentConstructor>;
    parent:DOMSite;

    constructor(parent:DOMSite)
    {
        this.parent = parent;
        this.pageMap = null;
    }

    InitRoutes(json:any)
    {
        //destroy whatever pagemap is already around
        this.pageMap = new Map<string,DOMComponentConstructor>();

        var keys = Object.keys(json);
        for (var i=0; i<keys.length; i++)
        {
            this.pageMap.set(keys[i],json[keys[i]]);
        }
    }

    GetPage(path:string):DOMComponent
    {
        if (!this.pageMap)
            return null;

        var ctor = this.pageMap.get(path);
        if (ctor)
            return new ctor(this.parent);
        else
            console.log(`DOMSite.GetPage - unrecognized path: ${path}`);
    }
};

export abstract class DOMSite extends DOMComponent
{
    pageMap:PageMap;
    currentPath:string;
    currentPage:DOMComponent;

    constructor()
    {
        super(null);
        this.pageMap = new PageMap(this);
        this.currentPath = null;
        this.currentPage = null;
    }

    InitRoutes(map:any)
    {
        this.pageMap.InitRoutes(map);
    }

    //when RouteTo routes to a path, it places the
    //component within the element returned by this method
    abstract GetRouteContentElement():HTMLElement;

    GetCurrentRoute():{path:string,page:DOMComponent}
    {
        return {page:this.currentPage,path:this.currentPath};
    }

    async RouteTo(path:string,options?:{pushState:boolean}):Promise<boolean>
    {
        if (!this.pageMap)
            return false;

        //default behavior is to call history.pushState for this new path
        //so that it gets added to the back/forward browser history.
        //
        //when reacting to a user click of forward/back, however, we 
        //simply want to navigate and not push. thats why this option exists,
        //to prevent pushing in that case. there may be other use cases (??)
        var pushState = options?options.pushState:true;

        try
        {
            if (this.currentPath===path)
            {
                //we're already there, we're done
                return true;
            }

            var p = this.pageMap.GetPage(path);
            if (p)
            {
                if (this.currentPage)
                {
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
                    history.pushState({path:path},'',path);

                await p.Render(this.GetRouteContentElement());

                return true;
            }
            else
            {
                console.log(`RouteTo - route does not exist: ${path}`);
            }
        }
        catch (err)
        {
            console.log("RouteTo error:");
            console.error(err);
        }

        return false;
    }
}

