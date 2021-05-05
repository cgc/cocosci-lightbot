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

If you're seeing an `Library not loaded: @rpath/libssl.1.1.dylib ... Reason: image not found` error when running `./bin/psiturk-herokudb', you may need to `pip uninstall psycopg2` and run the following:
```
pip install --global-option=build_ext \
            --global-option="-I/usr/local/opt/openssl/include" \
            --global-option="-L/usr/local/opt/openssl/lib" -r requirements.txt
```

## Experiment workflow
1. Prep code!
2. Update `experiment_code_version` and make a git tag marking commit the code was run with.
3. Scale up Heroku: `heroku ps:scale --app cocosci-optdisco web=1:Hobby`.
4. Using `./bin/psiturk-herokudb`, ensure `mode live`, submit with `hit create <# HIT> <payment> <expiry>`. Example is `hit create 9 4.00 1`.
5. Use sanity script to keep track of HITs & automatically scale down Heroku: `python bin/sanity.py cocosci-optdisco`.
6. Pay/Approve workers for a HIT with `worker approve --hit $HIT`. See HITs with `hit list --active`.
7. Verify all workers have been paid with `worker list --submitted`.
8. Download data with `PORT= ON_HEROKU=1 DATABASE_URL=$(heroku config:get DATABASE_URL) bin/fetch_data.py $CODE_VERSION`.


## Adding new OpenMoji

To add new OpenMoji, you need to edit `static/optdisco/images/openmoji/copyscript.py` by adding in the new emoji to copy in. You'll first have to download the OpenMoji SVG Color pack from [their site](https://openmoji.org/) and change paths in the script to work for your installation. Then run `copyscript.py`.
