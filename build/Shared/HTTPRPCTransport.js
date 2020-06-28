"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPC = require("./RPC.js");
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
//# sourceMappingURL=HTTPRPCTransport.js.map