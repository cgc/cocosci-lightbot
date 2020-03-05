import configparser
import psiturk.experiment_server as exp

config = configparser.ConfigParser()
config.read('config.txt')
sp = config['Server Parameters']
print(f'Server listening on ' + sp['host'] + ':' + sp['port'])

exp.launch()
