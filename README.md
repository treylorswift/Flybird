## Flybird

Flybird helps boost subscriptions to your newsletter. Try it at https://flybirdy.herokuapp.com.

<img src="https://i.imgur.com/WyeoQQ9.png" width=620>

Once you sign in, you can quickly create a page to direct potential subscribers to.

For example, Twitter user 'treylorswift' has a subscription page at https://flybirdy.herokuapp.com/subscribe/treylorswift

Other Twitter users can refer people to your subscription page and receive credit for the signup by using of a referral code in the subscription page link, like this:

https://flybirdy.herokuapp.com/subscribe/treylorswift?twRef=balajis

The Flybird Desktop App can be used to mass message all of your Twitter followers, sending each one a unique link to your subscriber page with their handle in the referral code.

### Deploying to Heroku
Out of the box this repo can be deployed to Heroku so long as the following Heroku config variables are defined:
- DATABASE_URL - a url for a Postgresql database
- SESSION_SECRET - a random string used to encrypt session cookies
- CONSUMER_KEY - the Twitter App API keys (obtainable at https://developer.twitter.com/apps)
- CONSUMER_SECRET - part of the above mentioned Twitter API key
- GMAIL_USER - username for the gmail account that will be used to send notification emails
- GMAIL_PW - password for the above account
