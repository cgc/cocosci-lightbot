# cocosci-optdisco

Navigation experiments over graphs to characterize hierarchical structure in behavior.

Test out the entire experiment [here](https://cocosci-optdisco.herokuapp.com) or try out specific tasks:
- [GraphTraining](https://cocosci-optdisco.herokuapp.com/testexperiment?type=GraphTraining)
- [PathIdentification](https://cocosci-optdisco.herokuapp.com/testexperiment?type=PathIdentification)

Adapted from Fred Callaway's [PsiTurk + Heroku](https://github.com/fredcallaway/psirokuturk) starter repository.

## Quickstart
Project uses Python 3. Install dependencies (here, in a virtualenv)
```
virtualenv env
env/bin/pip install -r requirements.txt
```

Run the server in development mode (template files will be reloaded).
```
make dev
```

If you have the Heroku CLI tools installed (can install with `brew install heroku`), you can run the server with
```
make heroku-server
```

Now, try out the [entire experiment](http://localhost:22362/) or demo specific plugins:
- [GraphTraining](http://localhost:22362/testexperiment?type=GraphTraining)
- [PathIdentification](http://localhost:22362/testexperiment?type=PathIdentification)

Push to heroku once you've set it as a git remote:
```
git push heroku master
```
