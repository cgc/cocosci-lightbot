import configparser
import os


def copy_env_to_config():
    c = configparser.ConfigParser()
    c.read('config.txt')

    changed = False
    if 'DATABASE_URL' in os.environ:
        c['Database Parameters']['database_url'] = os.environ['DATABASE_URL']
    if 'PORT' in os.environ:
        c['Server Parameters']['port'] = os.environ['PORT']

    corig = configparser.ConfigParser()
    corig.read('config.txt')
    if c != corig:
        with open('config.txt', 'w') as out:
            c.write(out)
