import os
import configparser
import boto3
from datetime import datetime
from threading import Event
import subprocess

def get_amt_client():
    c = configparser.ConfigParser()
    c.read(os.environ['HOME'] + '/.psiturkconfig')

    aws = c['AWS Access']
    client = boto3.client(
        'mturk',
        aws_access_key_id=aws['aws_access_key_id'],
        aws_secret_access_key=aws['aws_secret_access_key'],
    )
    return client

def find_matching_hits(client, predicate):
    hits = []
    kw = {}
    while True:
        r = client.list_hits(**kw)
        kw = dict(NextToken=r['NextToken'])
        related = [hit for hit in r['HITs'] if predicate(hit)]
        if hits:
            related = [
                    hit for hit in related
                    if hit['HITTypeId'] == hits[0]['HITTypeId']]
        if hits and not related:
            break
        hits += related
    return hits


def log_hits(heroku_app):
    q = f'<ExternalURL>https://{heroku_app}.herokuapp.com/pub?mode=live</ExternalURL>'

    hits = find_matching_hits(get_amt_client(), lambda hit: q in hit['Question'])

    max_, pending, avail = 0, 0, 0
    for hit in hits:
        #print(hit['HITId'], hit['HITTypeId'], hit['HITGroupId'], hit['Title'], hit['HITStatus'])
        max_ += hit['MaxAssignments']
        pending += hit['NumberOfAssignmentsPending']
        avail += hit['NumberOfAssignmentsAvailable']
    print(f'Found {len(hits)} HITs, HITTypeId: {hits[0]["HITTypeId"]}')
    print(f'max:{max_},pending:{pending},available:{avail}')
    return all(hit['HITStatus'] not in ('Assignable', 'Unassignable') for hit in hits)

def sanity_loop(heroku_app):
    done = log_hits(heroku_app)

    while not done:
        cmd = ['heroku', 'ps:scale', '--app', heroku_app]
        if subprocess.check_output(cmd).strip() == b'web=1:Free':
            print('\nWARNING: Experiment in progress with Heroku Free tier\n')
        print(datetime.now().isoformat(), 'sleeping')
        sleep(2*60)

        done = log_hits(heroku_app)

    cmd = ['heroku', 'ps:scale', '--app', heroku_app]
    if subprocess.check_output(cmd).strip() != b'web=1:Free':
        print('Setting Heroku instance to Free again')
        cmd = ['heroku', 'ps:scale', '--app', heroku_app, 'web=1:Free']
        subprocess.check_call(cmd)

def make_sleep():
    exit = Event()

    def quit(signo, _frame):
        print("Interrupted by %d, shutting down" % signo)
        exit.set()

    import signal
    for sig in ('TERM', 'HUP', 'INT'):
        signal.signal(getattr(signal, 'SIG'+sig), quit);

    def sleep(time):
        exit.wait(time)
        if exit.is_set():
            assert False, 'Ending early'

    return sleep

sleep = make_sleep()

if __name__ == '__main__':
    import sys
    heroku_app = sys.argv[1]
    assert heroku_app == 'cocosci-optdisco', 'Delete this only if you trust the program to run on other projects...'
    sanity_loop(heroku_app)

