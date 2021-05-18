# Important: Must be run first to copy environment vars to config
import env_to_config
env_to_config.copy_env_to_config()

# Now the code
import configparser
import psiturk.experiment_server as exp
import json
import os

# Verifying our configuration file matches our condition configuration.
def verify_config_conditions_match_json():
    config = configparser.ConfigParser()
    config.read('config.txt')
    with open('static/optdisco/js/configuration/configuration.js') as f:
        dd = f.read()
        # trim what we use to support es6 module loading
        assert dd.startswith('export default ') and dd.endswith(';')
        dd = dd[len('export default '):-len(';')]
        # now parse as JSON
        dd = json.loads(dd)
    nc_config = int(config['Task Parameters']['num_conds'])
    nc_json = len(dd['conditions'])
    assert nc_config == nc_json, f'Must match number conditions in Psiturk ({nc_config} conditions) and experiment JSON ({nc_json} conditions).'
    assert int(config['Task Parameters']['num_counters']) == 1
verify_config_conditions_match_json()

# Now starting the server based on config.
config = configparser.ConfigParser()
config.read('config.txt')
sp = config['Server Parameters']
print(f'Server listening on ' + sp['host'] + ':' + sp['port'])

app = exp.ExperimentServer().load()
assert app.url_map.bind('').match('/complete') == ('custom_code.debug_complete_prolific', {}), 'Custom Prolific handler is not correctly configured.'

if os.getenv('FLASK_ENV') == 'development':
    app.config.update(SEND_FILE_MAX_AGE_DEFAULT=0)
else:
    app.config.update(SEND_FILE_MAX_AGE_DEFAULT=24*60*60)

@app.after_request
def after_request_func(response):
    # Our CDN (fastly) asks us to use no_store for things that should not be stored.
    # Becuase we have a custom completion handler, and because the default /sync
    # doesn't provide useful caching headers, we'll try to enforce something definitive
    # here: Our static files are public and should be cached, but everything else shoudln't be.
    if not response.cache_control.public:
        response.cache_control.no_store = True
        response.cache_control.private = True
    return response

exp.launch()
