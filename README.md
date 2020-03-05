# cocosci-optdisco

Navigation experiments over graphs to characterize hierarchical structure in behavior.

Adapted from Fred Callaway's [PsiTurk + Heroku](https://github.com/fredcallaway/psirokuturk) starter repository.

## Quickstart
Project uses Python 3. Install dependencies (here, in a virtualenv)
```
virtualenv env
env/bin/pip install -r requirements.txt
```

Run the server:
```
make dev
```

Or, if you have the Heroku CLI tools installed (can install with `brew install heroku`), run with
```
make heroku-server
```

Now, try out the [entire experiment](http://localhost:22362/) or demo specific plugins:
- [GraphTraining](http://localhost:22362/testexperiment?type=GraphTraining)
- [PathIdentification](http://localhost:22362/testexperiment?type=PathIdentification)


# Psirokuturk README

A starter pack for running online experiments with Psiturk on Heroku.

## Requirements

As of version v2.3.1, psiturk supports Python 3. Install the bleeding edge version with the following command.

    pip install git+https://github.com/NYUCCL/psiTurk

Note that requirements.txt is for the heroku app, not for your local environment.

## Setup

1. Clone this repository
2. Create a Heroku account and install the [Heroku toolbelt](https://toolbelt.heroku.com/)
3. Create a new app and add a Postgres database
```
    heroku create YOUR_APP_NAME --buildpack heroku/python
    heroku git:remote -a YOUR_APP_NAME
    heroku addons:create heroku-postgresql
```
4. Write config variables
```
    bin/set_config.py
```
You will now have a config.txt file in this directory.

5. Add university-specific information in the template. Check templates/ad.html, templates/error.html, and config.txt for any mention of "Bodacious" University and replace with a more appropriate reference. You should also put your IRB-approved consent form in templates/consent.hmtl

6. Push to heroku
```
    git add .
    git commit -m 'my first commit'
    git push heroku master
```

## Usage

### Post HITs

Start the psiturk shell with the command `psiturk`. Run `hit create 30 1.50 0.5` to create 30 hits, each of which pays $1.50 and has a 30 minute time limit. You'll get a warning about your server not running. You are using an external server process, so you can press `y` to bypass the error message.
