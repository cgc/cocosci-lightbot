# Important: Must be run first to copy environment vars to config
import env_to_config
env_to_config.copy_env_to_config()

# Now the code
import configparser
import psiturk.experiment_server as exp
import json

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

exp.launch()
