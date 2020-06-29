## Flybird

Flybird helps boost subscriptions to your newsletter. Try it at https://flybirdy.herokuapp.com.

<img src="https://i.imgur.com/WyeoQQ9.png" width=620>

After signing in, your subscription page is automatically created.

For example, Twitter user 'Treylorswift' has a subscription page at https://flybirdy.herokuapp.com/subscribe/treylorswift.

## Features

- Customize the message displayed on your subscription page
- Export a .csv of all email addresses who have signed up
- Receive email notifications every time a sign up occurs
- View a leaderboard of referrers to see who is generating sign ups on your behalf

The Flybird Desktop App can be used to mass message all of your Twitter followers, sending each one a unique link to your subscriber page with their handle in the referral code.

For example, Twitter user 'balajis' will receive credit any time someone signs up to Treylorswift's subscription page with the following link:

https://flybirdy.herokuapp.com/subscribe/treylorswift?twRef=balajis

### Deploying to Heroku
Out of the box this repo can be deployed to Heroku so long as the following Heroku config variables are defined:
- DATABASE_URL - a url for a Postgresql database
- SESSION_SECRET - a random string used to encrypt session cookies
- CONSUMER_KEY - the Twitter App API keys (obtainable at https://developer.twitter.com/apps)
- CONSUMER_SECRET - part of the above mentioned Twitter API key
- GMAIL_USER - username for the gmail account that will be used to send notification emails
- GMAIL_PW - password for the above account
