import configparser
import psiturk.experiment_server as exp
import env_to_config

env_to_config.copy_env_to_config()

config = configparser.ConfigParser()
config.read('config.txt')
sp = config['Server Parameters']
print(f'Server listening on ' + sp['host'] + ':' + sp['port'])

exp.launch()
