# cocosci-lightbot

Experiment to examine how people algorithmically structure their solutions. Based on Lightbot, a game used to teach programming. Code draws heavily from https://github.com/haan/Lightbot.

Test out the entire experiment [here](https://cocosci-lightbot.herokuapp.com) or try out specific tasks:
- [LightbotTutorial](https://cocosci-lightbot.herokuapp.com/testexperiment?type=LightbotTutorial)
- [LightbotTask](https://cocosci-lightbot.herokuapp.com/testexperiment?type=LightbotTask)
- [specific maps](https://cocosci-lightbot.herokuapp.com/testexperiment?type=LightbotTask&mapSource=maps&mapIdx=8)

Adapted from Fred Callaway's [PsiTurk + Heroku](https://github.com/fredcallaway/psirokuturk) starter repository.

## Quickstart
Project uses Python 3. Install dependencies (here, in a virtualenv)
```
virtualenv env
. env/bin/activate
pip install -r requirements.txt
```

It also uses Parcel to bundle JavaScript and CSS, which requires installation:
```
npm install
```

You can run the development stack using a Procfile runner (like forego, `brew install forego`):
```
make dev
```

In place of the Procfile runner, you can run the two processes you need to run the server: the Python server (with `make dev-python`) and the JavaScript bundler (with `npm run watch`).

### Try it out!

Now, try out the [entire experiment](http://localhost:5000/) or demo specific plugins:
- [LightbotTutorial](http://localhost:5000/testexperiment?type=LightbotTutorial)
- [LightbotTask](http://localhost:5000/testexperiment?type=LightbotTask)

Push to heroku once you've set it as a git remote:
```
git push heroku master
```

### Errors

If you're seeing an `Library not loaded: @rpath/libssl.1.1.dylib ... Reason: image not found` error when running `./bin/psiturk-herokudb', you may need to `pip uninstall psycopg2` and run the following:
```
pip install --global-option=build_ext \
            --global-option="-I/usr/local/opt/openssl/include" \
            --global-option="-L/usr/local/opt/openssl/lib" -r requirements.txt
```

## Experiment workflow
1. Prep code! Make sure cost on consent screen (`templates/consent.html`) is up to date.
2. Update `experiment_code_version` and make a git tag marking commit the code was run with.
3. Scale up Heroku: `heroku ps:scale --app cocosci-lightbot web=1:Hobby`.
4. Using `./bin/psiturk-herokudb`, ensure `mode live`, submit with `hit create <# HIT> <payment> <expiry>`. Example is `hit create 9 4.00 1`.
5. Use sanity script to keep track of HITs & automatically scale down Heroku: `python bin/sanity.py cocosci-lightbot`.
6. Pay/Approve workers for a HIT with `worker approve --hit $HIT`. See HITs with `hit list --active`.
7. Verify all workers have been paid with `worker list --submitted`.
8. Download data with `PORT= ON_HEROKU=1 DATABASE_URL=$(heroku config:get DATABASE_URL) bin/fetch_data.py $CODE_VERSION`.


## Adding new OpenMoji

To add new OpenMoji, you need to edit `static/lightbot/images/openmoji/copyscript.py` by adding in the new emoji to copy in. You'll first have to download the OpenMoji SVG Color pack from [their site](https://openmoji.org/) and change paths in the script to work for your installation. Then run `copyscript.py`.
