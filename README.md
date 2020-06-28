## Flybird

Flybird helps boost subscriptions to your newsletter.

Visit the website, sign in with your Twitter account, and setup a subscriptions page. Share this link with anyone who might be interested in learning more about your newsletter.

Any time some submits their email address on your subscriptions page, you'll get an email notification.

![admin](https://i.imgur.com/JKYe1aB.png)
![signup](https://i.imgur.com/MTsT8It.png)

### Live Demo
There is a live version deployed to Heroku currently at https://itk-signup.herokuapp.com

### Deploying to Heroku
Out of the box this repo can be deployed to Heroku so long as the following Heroku config variables are defined:
- DATABASE_URL - a url for a Postgresql database
- SESSION_SECRET - a random string used to encrypt session cookies
- CONSUMER_KEY - the Twitter App API keys (obtainable at https://developer.twitter.com/apps)
- CONSUMER_SECRET - part of the above mentioned Twitter API key
- GMAIL_USER - username for the gmail account that will be used to send notification emails
- GMAIL_PW - password for the above account
