# cocosci-lightbot

Experiment to examine how people algorithmically structure their plans. Try this [playable demo](https://carlos.correa.me/cocosci-lightbot/). The experiment we ran for *Exploring the hierarchical structure of human plans via program generation* is a previous version that you can access [here](https://github.com/cgc/cocosci-lightbot/releases/tag/v0.4).

Based on [Lightbot](https://lightbot.com/), a game used to teach programming developed by SpriteBox LLC.
This codebase draws heavily from Laurent Haan's [open source implementation](https://github.com/haan/Lightbot).
[Icon](https://opengameart.org/content/botty) by Carl Olsson is in the public domain.

Experiment is based on Fred Callaway's [PsiTurk + Heroku](https://github.com/fredcallaway/psirokuturk) starter repository.

## Quickstart

### Setup

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

### Local development

You can run the development stack using a Procfile runner (like forego, `brew install forego`):
```
make dev
```

In place of the Procfile runner, you can run the two processes you need to run the server: the Python server (with `make dev-python`) and the JavaScript bundler (with `npm run watch`).

Now, try out the [entire experiment](http://localhost:5000/) or demo specific plugins:
- [LightbotTutorial](http://localhost:5000/testexperiment?type=LightbotTutorial)
- [LightbotTask](http://localhost:5000/testexperiment?type=LightbotTask)
- [LightbotTask](http://localhost:5000/testexperiment?type=LightbotTask&mapSource=maps&mapIdx=7) - With specified task.
- [LightbotTask](http://localhost:5000/testexperiment?type=LightbotTask&drawTrajectory=1&mapSource=maps&mapIdx=7&program=1DCE1|BCDCAB|||) - With specified task, and draws trajectories when run. Snapshot of trajectory for a supplied program can be downloaded when `window.SNAPSHOT()` is called.

### Deploy to heroku

Push to heroku once you've set it as a git remote:
```
git push heroku master
```

Test out the experiment on Heroku [here](https://cocosci-lightbot.herokuapp.com) or try out specific trial types:
- [LightbotTutorial](https://cocosci-lightbot.herokuapp.com/testexperiment?type=LightbotTutorial)
- [LightbotTask](https://cocosci-lightbot.herokuapp.com/testexperiment?type=LightbotTask)
- [specific maps](https://cocosci-lightbot.herokuapp.com/testexperiment?type=LightbotTask&mapSource=maps&mapIdx=8)

### Build demo page

Build demo page and delete the old one with
```
rm -r gh-pages
npm run demo-build
```
To update the live demo page, commit and push the `gh-pages` folder. It is live [here](https://carlos.correa.me/cocosci-lightbot/).

Run it locally with the following, then access [here](http://localhost:1234/cocosci-lightbot/).
```
npm run demo-serve
```

## Heroku workflow for AMT
1. Prep code! Make sure cost on consent screen (`templates/consent.html`) is up to date.
2. Update `experiment_code_version` and make a git tag marking commit the code was run with.
3. Scale up Heroku: `heroku ps:scale --app cocosci-lightbot web=1:Hobby`.
4. Using `./bin/psiturk-herokudb`, ensure `mode live`, submit with `hit create <# HIT> <payment> <expiry>`. Example is `hit create 9 4.00 1`.
5. Use sanity script to keep track of HITs & automatically scale down Heroku: `python bin/sanity.py cocosci-lightbot`.
6. Pay/Approve workers for a HIT with `worker approve --hit $HIT`. See HITs with `hit list --active`.
7. Verify all workers have been paid with `worker list --submitted`.
8. Download data with `PORT= ON_HEROKU=1 DATABASE_URL=$(heroku config:get DATABASE_URL) bin/fetch_data.py $CODE_VERSION`.
