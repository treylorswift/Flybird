import * as pg from 'pg'
import * as TwitterAuth from './TwitterAuth'
import * as Twitter from 'twitter-lite'
import * as express from 'express';
import * as fs from 'fs';
import {HTTPRPC} from '../Shared/HTTPRPCTransport'
import * as ServerApi from '../Shared/ServerApi'
import * as RPC from '../Shared/RPC'

//when hosting on Heroku, make sure to define the following environment vars ("Config Variables")
//DATABASE_URL - the location of the postgresql database
//SESSION_SECRET - random string used to encrypt session cookies
//CONSUMER_KEY - the Twitter App API key
//CONSUMER_SECRET - the Twitter App API
//GMAIL_USER - the gmail account notification emails are sent from
//GMAIL_PW - password for the gmail account the notification emails are sent from

const g_localDevServer = true;
if (g_localDevServer)
    console.log("Running in local dev mode..");
else
    console.log("Running in production mode..");

//if set to true, all the above Heroku / environment vars are not used.
//instead, most of those values are hardcoded below.
//search for g_localDevServer to find where to fill in the blanks
//the only thing not hard coded is the Twitter Api app keys, which you must
//place into 'app_auth.json'

var session         = require('express-session');
var passport        = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
const nodemailer    = require('nodemailer');    
const bodyParser    = require('body-parser');


var CALLBACK_URL = 'https://itk-signup.herokuapp.com/auth/twitter/callback';

if (g_localDevServer)
    CALLBACK_URL = 'http://localhost:3000/auth/twitter/callback';


//this is used to encrypt session cookies - in production, should be in an environment variable defined on the server
let SESSION_SECRET = process.env.SESSION_SECRET;

if (g_localDevServer)
    SESSION_SECRET = 'vnyfw87ynfch3/AFV(FW(IFCN@A@O#J$F)FANJC@IEQEN'

// Initialize Express and middlewares
var sessionParser = session({secret: SESSION_SECRET, resave: false, saveUninitialized: false});
var app = express();
app.use(sessionParser);
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true , limit: '5mb'}));
app.use(bodyParser.json({limit: '5mb'}));


passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

let g_appAuth:TwitterAuth.AppAuth = null;

//@ts-ignore
let g_bearerTokenTwitter:Twitter = null;

type GmailAuth = {user:string, pass:string};
let g_gmailAuth:GmailAuth = null;

let g_pgdb:PGDB = null;


type UserRow = {id_str:string, screen_name:string, name:string, email:string, subscription_message:string, profile_image_url:string};
type SignUpRow = {publisher_id_str:string, subscriber_email:string, referrer_id_str: string};

class PGDB
{
    pool:pg.Pool;
    async Init():Promise<boolean>
    {    
        try
        {
            let dbUrl = process.env.DATABASE_URL;

            console.log("DATABASE_URL:");
            console.log(dbUrl);

            let dbConfig:any = {
                connectionString: dbUrl
            };

            if (g_localDevServer)
            {
                dbConfig.user = 'postgres';
                dbConfig.password = 'testing123';
            }
            else
            {
                dbConfig.ssl = {
                    rejectUnauthorized: false
                }
            }

            this.pool = new pg.Pool(dbConfig);

            let res;

            //res = await this.pool.query(
            //    `DROP TABLE ITKUsers;`);

            //////////////////////
            //the ITKUsers table
            //everyone who has signed in via twitter
            //and any additional info they've saved like their email address, their subscription message
            ////////////////////
            res = await this.pool.query(
                `CREATE TABLE IF NOT EXISTS ITKUsers
                (
                    id_str TEXT NOT NULL PRIMARY KEY,
                    screen_name TEXT,
                    name TEXT,
                    profile_image_url TEXT,
                    email TEXT,
                    subscription_message TEXT
                );`);

            res = await this.pool.query(
                `ALTER TABLE ITKUsers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;`);

            res = await this.pool.query(
                `ALTER TABLE ITKUsers ADD COLUMN IF NOT EXISTS name TEXT;`);

            res = await this.pool.query(
                `ALTER TABLE ITKUsers ADD COLUMN IF NOT EXISTS subscription_message TEXT;`);

            //res = await this.pool.query(`DROP TABLE SignUps`);

            res = await this.pool.query(
                `CREATE TABLE IF NOT EXISTS SignUps
                (
                    publisher_id_str TEXT NOT NULL,
                    subscriber_email TEXT NOT NULL,
                    referrer_id_str TEXT,
                    CONSTRAINT prevent_duplicates UNIQUE(publisher_id_str,subscriber_email,referrer_id_str)
                );`);

            //index the SignUps by publisher and referrer
            res = await this.pool.query(`
                CREATE INDEX IF NOT EXISTS SignUps_publisher_id_str_index ON SignUps (
	                "publisher_id_str"
                );
            `);

            res = await this.pool.query(`
                CREATE INDEX IF NOT EXISTS SignUps_referrer_index ON SignUps (
	                "referrer_id_str"
                );
            `);

            //console.log(JSON.stringify(res));
        }
        catch (err)
        {
            console.log("Error initializing PGDB:");
            console.error(err);
            return false;
        }

        return true;
    }

    async GetUserByScreenName(screen_name:string):Promise<UserRow>
    {
        try
        {
            const res = await this.pool.query(
                `SELECT * FROM ITKUsers WHERE screen_name=$1`,
                [screen_name]);

            return res.rows[0] as UserRow;
        }
        catch (err)
        {
            console.log("GetUserByScreenName error:");
            console.error(err);
        }
        return null;
    }

    async GetUserById(id_str:string):Promise<UserRow>
    {
        try
        {
            const res = await this.pool.query(
                `SELECT * FROM ITKUsers WHERE id_str=$1`,
                [id_str]);
       
            return res.rows[0] as UserRow;
        }
        catch (err)
        {
            console.log("GetUserById error:");
            console.error(err);
        }
        return null;
    }


    async SetUserScreenNameAndEmail(id_str:string, screen_name:string, email:string):Promise<boolean>
    {
        try
        {
            const res = await this.pool.query(
                `INSERT INTO ITKUsers (id_str, screen_name, email) VALUES ($1,$2,$3)
                 ON CONFLICT (id_str) DO UPDATE SET screen_name=$2,email=$3`,
                [id_str,screen_name,email]);

            return true;
        }
        catch (err)
        {
            console.log("SetUserScreenNameAndEmail error:");
            console.error(err);

            return false;
        }
    }

    async SetUserSubscriptionMessage(id_str:string, message:string):Promise<boolean>
    {
        try
        {
            const res = await this.pool.query(
                `INSERT INTO ITKUsers (id_str, subscription_message) VALUES ($1,$2)
                 ON CONFLICT (id_str) DO UPDATE SET subscription_message=$2`,
                [id_str,message]);

            return true;
        }
        catch (err)
        {
            console.log("SetUserSubscriptionMessage error:");
            console.error(err);

            return false;
        }
    }

    async InitUser(id_str:string, screen_name:string, name:string, profile_image_url:string):Promise<void>
    {
        try
        {
            const res = await this.pool.query(
                `INSERT INTO ITKUsers (id_str, screen_name, name, profile_image_url) VALUES ($1,$2,$3,$4)
                 ON CONFLICT (id_str) DO UPDATE SET screen_name=$2, name=$3, profile_image_url=$4`,
                [id_str,screen_name,name,profile_image_url]);
            //console.log(JSON.stringify(res));
        }
        catch (err)
        {
            console.log("InitUser error:");
            console.error(err);
        }
    }

    async StoreSignUp(publisher_id_str:string, subscriber_email:string, referrer_id_str:string):Promise<void>
    {
        try
        {
            const res = await this.pool.query(
                `INSERT INTO SignUps (publisher_id_str, subscriber_email, referrer_id_str) VALUES ($1,$2,$3)
                    ON CONFLICT ON CONSTRAINT prevent_duplicates DO NOTHING;`,
                [publisher_id_str, subscriber_email, referrer_id_str]);
        }
        catch (err)
        {
            console.log("InitUser error:");
            console.error(err);
        }
        //console.log(JSON.stringify(res));
    }

    async GetSignUps(publisher_id_str:string):Promise<Array<SignUpRow>>
    {
        try
        {
            const res = await this.pool.query(
                `SELECT * FROM SignUps WHERE publisher_id_str=$1`,
                [publisher_id_str]);
       
            return res.rows as Array<SignUpRow>;
        }
        catch (err)
        {
            console.log("GetSignUps error:");
            console.error(err);
        }
        return null;
    }

    async RemoveUserById(id_str:string)
    {
        try
        {
            const res = await this.pool.query(
                `DELETE FROM ITKUsers WHERE id_str=$1`,
                [id_str]);
            //console.log(JSON.stringify(res));
        }
        catch (err)
        {
            console.log("RemoveUserById error:");
            console.error(err);
        }
    }

}



app.get('/auth/twitter', async (req,res)=>
{

    //use twitter oauth to obtain user access token and secret
    passport.use(new TwitterStrategy(
        {
            consumerKey: g_appAuth.consumer_key,
            consumerSecret: g_appAuth.consumer_secret,
            callbackURL: CALLBACK_URL
        },
        async function(token, tokenSecret, profile, cb)
        {
            try
            {
                //make sure we have this info in the db
                let profile_image_url = '';
                try { profile_image_url = profile.photos[0].value; } catch (err) {}

                let name = '';
                try { name = profile.displayName } catch (err) {}

                let setOK = await g_pgdb.InitUser(profile.id, profile.username, name, profile_image_url);

                cb(null,profile);
            }
            catch (err)
            {
                console.log("Error attempting to validate user auth keys:");
                console.error(err);

                cb(err,null);
            }

        }
    ));

    let funcToCall = passport.authenticate('twitter');
    funcToCall(req,res);
});

// Set route for OAuth redirect
app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/authError' }));

//after oauth login we do a final check here just so we can show them an error on this landing page if
//something went wrong
app.get('/authError', (req,res) =>
{
    res.send('<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><br/><br/>Error logging you in with Twitter, sorry</body></html>');
});



type TwitterSessionProfile = {
    id:string,
    username:string,
    displayName:string
}

function GetProfileFromRequest(req):TwitterSessionProfile
{
    try
    {
        let profile = req.session.passport.user;
        if (!profile.id || !profile.username)
            return null;

        return profile
    }
    catch (err)
    {
        return null;
    }
}


//set HTTP Transport as the default RPC transport mechanism

app.post('/api/*', async (req,res)=>
{
    let api_method = req.path.substr(5); //skip the leading /api/
    let profile = GetProfileFromRequest(req);

    try
    {
        let c = {
            method:api_method,
            args:req.body
        }

        let response = await HTTPRPC.HandleIncomingCall(c as RPC.Call, profile);
        res.send(JSON.stringify(response));
    }
    catch (err)
    {
        console.log(`Error handling ${req.path}:`);
        console.error(err);
        res.sendStatus(500);
    }

});


/////////////////////////
//handle the sign up api
//////////////////////
HTTPRPC.SetHandler(ServerApi.SignUpCall, async (c:ServerApi.SignUpCall):Promise<RPC.Response> =>
{
    //sign ups do not require logging in
    //let profile = GetProfileFromRequest(req);

    //json must contain:
    //id: the twitter id of the user whose newsletter they are interested in
    //email: the email address of the person who is interested
    if (!c.args.owner_id_str || !c.args.email)
    {
        return {success:false,error:RPC.Error.InvalidParams};
    }
    
    let userRow = await g_pgdb.GetUserById(c.args.owner_id_str);

    //we gotta know whose newsletter it is they're looking for..
    if (!userRow)
        return {success:false, error:RPC.Error.Internal};

    //pull out whatever twitter handle was included in the original sign up link
    let referrer_id_str = null;
    let referringTwitterHandle = '';
    if (c.args.referrer_screen_name)
    {
        try
        {
            //gotta look up the id_str of this screen name
            let showResult = await g_bearerTokenTwitter.get("users/show", {screen_name:c.args.referrer_screen_name, include_entities:false, stringify_ids:true});

            referrer_id_str = showResult.id_str;
            referringTwitterHandle = c.args.referrer_screen_name;
        }
        catch (err)
        {
            console.log("Error attempting to resolve referrer screen name, no referrer will get credit here: " + c.args.referrer_screen_name);
            console.error(err);
        }
    }

    //ok store the signup
    g_pgdb.StoreSignUp(c.args.owner_id_str, c.args.email, referrer_id_str);

    //if they didnt specify an email (yet) we are done and can just return
    if (!userRow.email)
        return {success:true};

    //so now, we can send them that email
    try
    {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: g_gmailAuth.user,
                pass: g_gmailAuth.pass
            }
        });
 
        let referralMessage = ''
        if (referringTwitterHandle)
            referralMessage = `They were referred by Twitter user "${referringTwitterHandle}". `;

        var mailOptions = {
          from: `${g_gmailAuth.user}@gmail.com`,
          to: userRow.email,
          subject: `${c.args.email} is interested in your newsletter!`,
          text:
`${c.args.email} has opted in to hear more about your newsletter. ${referralMessage}Get in touch with them and share your brilliant ideas!

Cheers,

Influencer Toolkit`
        };

        let sendMailPromise = new Promise<boolean>((resolve,reject)=>
        {
            transporter.sendMail(mailOptions, (err, info) =>
            {
                if (err)
                {
                    console.log(`Error sending email to ${userRow.email}:`);
                    console.log(err);
                    resolve(false);
                }
                else
                {
                    resolve(true);
                }
            });
        });

        let sendMailResult = await sendMailPromise;
        return {success:sendMailResult};
    }
    catch (err)
    {
        console.log(`Error sending email to ${userRow.email}:`);
        console.log(err);
        return {success:false};
    }
});

///////////////
//handle GetSignUps
// returns all the emails that have signed up for the logged in user
////////////////////////
HTTPRPC.SetHandler(ServerApi.GetUserSignUpsCall, async(c:ServerApi.GetUserSignUpsCall, profile:TwitterSessionProfile):Promise<ServerApi.GetUserSignUpsResponse> =>
{
    //is there a valid profile?
    if (!profile || !profile.id || !profile.username)
        return {success:false, signUps:null, error:RPC.Error.NotLoggedIn};
    
    let rows = await g_pgdb.GetSignUps(profile.id);
    let returnRows = new Array<{email:string,referrer:string}>();
    for (var i=0; i<rows.length; i++)
    {
        returnRows.push({email:rows[i].subscriber_email, referrer:rows[i].referrer_id_str});
    }

    return {success:true, signUps:returnRows};
    
});


//////////////////
//Handle SetUserNotificationEmail
/////////////////
function ValidateEmailAddress(email) 
{
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (re.test(email))
        return true;

    return false;
}

HTTPRPC.SetHandler(ServerApi.SetUserNotificationEmailCall, async (c:ServerApi.SetUserNotificationEmailCall, profile:TwitterSessionProfile):Promise<RPC.Response> =>
{
    //there must be some user logged in
    if (!profile)
        return {success:false,error:RPC.Error.NotLoggedIn};

    if (!c.args.email || !ValidateEmailAddress(c.args.email))
    {
        return {success:false,error:RPC.Error.InvalidParams};
    }

    if (g_pgdb.SetUserScreenNameAndEmail(profile.id, profile.username, c.args.email))
        return {success:true};
    else
        return {success:false};
});

//////////////////
//Handle SetUserSubscriptionMessage
/////////////////
HTTPRPC.SetHandler(ServerApi.SetUserSubscriptionMessageCall, async (c:ServerApi.SetUserSubscriptionMessageCall, profile:TwitterSessionProfile):Promise<RPC.Response> =>
{
    //there must be some user logged in
    if (!profile)
        return {success:false,error:RPC.Error.NotLoggedIn};

    if (!c.args.message)
    {
        return {success:false,error:RPC.Error.InvalidParams};
    }

    if (g_pgdb.SetUserSubscriptionMessage(profile.id, c.args.message))
        return {success:true};
    else
        return {success:false};
});

///////////////////
//handle CancelUserAccount
/////////////////////
HTTPRPC.SetHandler(ServerApi.CancelUserAccountCall, async(c:ServerApi.CancelUserAccountCall, profile:TwitterSessionProfile):Promise<RPC.Response> =>
{
    //must be logged in
    if (!profile)
        return {success:false,error:RPC.Error.NotLoggedIn};

    if (g_pgdb.RemoveUserById(profile.id))
        return {success:true};
    else
        return {success:false};
});

///////////////
//handle GetUserByScreenName
// just returns whether or not the user has a sign up page
// they must have submitted their email address for the sign up page to exist
////////////////////////
HTTPRPC.SetHandler(ServerApi.GetUserByScreenNameCall, async(c:ServerApi.GetUserByScreenNameCall, profile:TwitterSessionProfile):Promise<ServerApi.GetUserResponse> =>
{
    //a valid login is not required for this api
    //if (!profile)
    
    //but, the sign up page being requested must request a sign up for a user who has, at the very least, logged in
    //at some point in the past with twitter.
    let user = await g_pgdb.GetUserByScreenName(c.args.screen_name);
    if (!user || !user.screen_name || !user.id_str)
        return {success:true, id_str:'', has_sign_up_page:false, screen_name:'', name:'', subscription_message:'', email:'', profile_image_url:''}
    
    let email = '';
    if (profile && profile.username===c.args.screen_name)
        email = user.email;

    return {
        success:true,
        id_str:user.id_str,
        screen_name:user.screen_name,
        has_sign_up_page:true,
        profile_image_url: user.profile_image_url,
        subscription_message:user.subscription_message,
        email:email,
        name:user.name
    };
});

///////////////
//handle GetLoggedInUser
// returns info about whoever is currently logged in
////////////////////////
HTTPRPC.SetHandler(ServerApi.GetLoggedInUserCall, async(c:ServerApi.GetLoggedInUserCall, profile:TwitterSessionProfile):Promise<ServerApi.GetLoggedInUserResponse> =>
{
    //is there a valid profile?
    if (!profile || !profile.id || !profile.username)
        return {success:false, loggedInUser:null, error:RPC.Error.NotLoggedIn};
    
    let userRow = await g_pgdb.GetUserById(profile.id);

    let email = '';
    if (userRow && userRow.email)
        email = userRow.email;

    return {success:true, loggedInUser:{id_str:profile.id, screen_name:profile.username, profile_image_url:userRow.profile_image_url, name:profile.displayName}};
    
});

app.use(express.static('./www'));

if (g_localDevServer)
{
    console.log('exposing .ts files for source maps');
    app.use(express.static('../../')); //for client .ts files (referenced by source maps)
}

//anything that is not an api call, and is not an /auth (oauth) flow call, and does not match a file name in the www folder..
//will get handled here, and it will just return index.html
app.get('*', async function (req, res)
{
    res.sendFile("www/index.html",{root:'./'});
});



function ValidateGmailAuth():boolean
{
    let gmail_auth:GmailAuth = null;

    if (g_localDevServer)
    {
        try
        {
            gmail_auth = JSON.parse(fs.readFileSync('./gmail_auth.json','utf-8'));
        }
        catch (err)
        {
            console.log("Error reading ./gmail_auth.json - please put gmail 'user' and 'pass' into ./gmail_auth.json");
            console.error(err);
            return false;
        }
    }
    else
    {
        //production deploy pulls auth from environment variables
        gmail_auth = {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PW
        }
    }

    if (!gmail_auth.user || typeof(gmail_auth.user)!=='string' ||
        !gmail_auth.pass || typeof(gmail_auth.pass)!=='string')
    {
        console.log(`Gmail auth must have non-empty strings for 'user' and 'pass': ${JSON.stringify(gmail_auth)}`);
        return false;
    }

    g_gmailAuth = gmail_auth;
    return true;
}


async function ValidateAppAuth():Promise<boolean>
{
    let app_auth:TwitterAuth.AppAuth;

    if (g_localDevServer)
    {
        app_auth = TwitterAuth.TryLoadAppAuth('app_auth.json')
        if (!app_auth)
        {
            console.log("Failed to obtain keys from app_auth.json");
            return false;
        }
    }
    else
    {
        //production deploy pulls auth from environment variables
        app_auth = {
            consumer_key: process.env.CONSUMER_KEY,
            consumer_secret: process.env.CONSUMER_SECRET
        }
    }

    try
    {
        //@ts-ignore
        let testClient = new Twitter({
            consumer_key: app_auth.consumer_key,
            consumer_secret: app_auth.consumer_secret
        });

        const bearerOK = await testClient.getBearerToken();

        //@ts-ignore
        g_bearerTokenTwitter = new Twitter({
            bearer_token: bearerOK.access_token
        });

        //no error means the keys were valid, store them to the global
        //and proceed to check user auth keys
        g_appAuth = app_auth;
    }
    catch (err)
    {
        console.log("Error validating stored app auth keys:");
        console.error(err);
        return false;
    }

    return true;
}

async function main()
{
    //before we start, check to see if we have valid app auth and user auth keys already.
    //if so, we won't need to ask the user for them
    console.log("Getting Twitter API keys..");
    let authOK = await ValidateAppAuth();
    if (!authOK)
    {
        process.exit(-1);
    }

    console.log("Getting Gmail auth..");
    let gmailOK = ValidateGmailAuth();
    if (!gmailOK)
        process.exit(-1);

    //make sure db connection works
    console.log("Testing db connection..");
    g_pgdb = new PGDB();
    let dbOK = await g_pgdb.Init();
    if (!dbOK)
    {
        console.log("g_pgdb.Init() failed");
        process.exit(-1);
    }   

    let port = process.env.PORT;
    if (g_localDevServer)
        port = '3000';

    app.listen(port);
    console.log(`Listening on port ${port}`);
}

main();



