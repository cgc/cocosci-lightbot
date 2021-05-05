#!/usr/bin/env python3
import os
import pandas as pd
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
import hashlib
from psiturk.models import Participant

def hash_id(worker_id):
    return 'md5:' + hashlib.md5(worker_id.encode()).hexdigest()

def write_csv_from_db(filename, version):
    ps = Participant.query.filter(Participant.codeversion == version).all()
    # We filter out any debug trials.
    ps = [p for p in ps if 'debug' not in p.uniqueid]
    # HACK we don't filter out for completion status.

    def qdata(p):
        '''
        A hack: to avoid needing to attach condition and other metadata to
        every participant's qdata, we just sprinkle it in here from the DB.
        '''
        rows = p.get_question_data()
        if rows:
            assert rows[-1] == '\n'
        rows += f'{p.uniqueid},condition,{p.cond}\n'
        rows += f'{p.uniqueid},counterbalance,{p.counterbalance}\n'
        rows += f'{p.uniqueid},status,{p.status}\n'
        return rows

    # https://github.com/NYUCCL/psiTurk/blob/master/psiturk/models.py
    contents = {
        "trialdata": lambda p: p.get_trial_data(),
        "eventdata": lambda p: p.get_event_data(),
        "questiondata": qdata,
    }

    data = []
    for p in ps:
        try:
            data.append(contents[filename](p))
        except:
            import traceback
            traceback.print_exc()
    data = "".join(data)

    # write out the data file
    dest = os.path.join('data/human_raw', version, "{}.csv".format(os.path.splitext(filename)[0]))
    if not os.path.exists(os.path.dirname(dest)):
        os.makedirs(os.path.dirname(dest))
    with open(dest, "w") as fh:
        fh.write(data)

    # Anonymize PIDs
    df = pd.read_csv(dest, header=None)
    df[0] = df[0].map(hash_id)
    df.to_csv(dest, header=None, index=False)

def main(version):
    for filename in ["trialdata", "eventdata", "questiondata"]:
        write_csv_from_db(filename, version)

if __name__ == "__main__":
    parser = ArgumentParser(
        formatter_class=ArgumentDefaultsHelpFormatter)
    parser.add_argument(
        "version",
        help=("Experiment version. This corresponds to the experiment_code_version "
              "parameter in the psiTurk config.txt file that was used when the "
              "data was collected."))
    args = parser.parse_args()
    main(args.version)
