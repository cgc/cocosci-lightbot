# this file imports custom routes into the experiment server

from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError, InvalidUsage
from psiturk.user_utils import PsiTurkAuthorization, nocache

# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads

# load the configuration options
config = PsiturkConfig()
config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

# explore the Blueprint
custom_code = Blueprint('custom_code', __name__, template_folder='templates', static_folder='dist')


@custom_code.route('/testexperiment')
def testexperiment():
    data = {
        key: "{{ " + key + " }}"
        for key in ['uniqueId', 'condition', 'counterbalance', 'adServerLoc', 'mode']
    }
    return render_template('exp.html', **data)


@custom_code.route('/complete', methods=['GET'])
@nocache
def debug_complete_prolific():
    '''
    This route overwrites the default /complete route to add support for prolific.
    '''

    # Importing here to avoid a circular import when gunicorn runs the server.
    from psiturk.experiment import debug_complete
    # First we run this to make sure data is appropriately saved.
    original_response = debug_complete()

    # Then, we see whether we should use that response.
    mode = request.args['mode']
    user = Participant.query.filter(Participant.uniqueid == request.args['uniqueId']).one()
    # Our convention for prolific studies are that the hitid is the string `prolific`.
    # Only when we're serving a sandbox/live (aka non-debug) request do we route people to
    # a completion code.
    if mode in ('sandbox', 'live') and user.hitid == 'prolific':
        return render_template('complete_prolific.html', completion_code=config.get('Prolific Configuration', 'completion_code'))
    # Outside of that case, we fall back to the default logic.
    else:
        return original_response


@custom_code.route('/complete2', methods=['GET'])
@nocache
def debug_complete2():
    ''' Debugging route for complete. '''
    assert (
        'uniqueId' in request.args and
        request.args['uniqueId'].startswith('debug') and
        'mode' in request.args and
        request.args['mode'] == 'debug'
    ), 'improper_inputs'
    unique_id = request.args['uniqueId']
    user = Participant.query.filter(Participant.uniqueid == unique_id).one()
    fields = [
        'uniqueid', 'assignmentid', 'workerid', 'hitid', 'ipaddress', 'browser',
        'platform', 'language', 'cond', 'counterbalance', 'codeversion',
        'bonus', 'status', 'mode']
    user_json = {f: getattr(user, f) for f in fields}
    for dt in ['beginhit', 'beginexp', 'endhit']:
        user_json[dt] = getattr(user, dt)
        if user_json[dt]:
            user_json[dt] = user_json[dt].isoformat()
    user_json['datastring'] = loads(user.datastring)
    user_json = dumps(user_json, sort_keys=True, indent=4)
    return render_template('complete.html', user_json=user_json)


def get_participants(codeversion):
    return (
        Participant
        .query
        .filter(Participant.codeversion == codeversion)
        # .filter(Participant.status >= 3)  # only take completed
        .all()
    )




#----------------------------------------------
# example custom route
#----------------------------------------------
@custom_code.route('/my_custom_view')
def my_custom_view():
    current_app.logger.info("Reached /my_custom_view")  # Print message to server.log for debugging
    try:
        return render_template('custom.html')
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example using HTTP authentication
#----------------------------------------------
@custom_code.route('/my_password_protected_route')
@myauth.requires_auth
def my_password_protected_route():
    try:
        return render_template('custom.html')
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example accessing data
#----------------------------------------------
@custom_code.route('/view_data')
@myauth.requires_auth
def list_my_data():
    users = Participant.query.all()
    try:
        return render_template('list.html', participants=users)
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example computing bonus
#----------------------------------------------

@custom_code.route('/compute_bonus', methods=['GET'])
def compute_bonus():
    # check that user provided the correct keys
    # errors will not be that gracefull here if being
    # accessed by the Javascrip client
    if not request.args.has_key('uniqueId'):
        raise ExperimentError('improper_inputs')  # i don't like returning HTML to JSON requests...  maybe should change this
    uniqueId = request.args['uniqueId']

    try:
        # lookup user in database
        user = Participant.query.\
               filter(Participant.uniqueid == uniqueId).\
               one()
        user_data = loads(user.datastring) # load datastring from JSON
        bonus = 0

        for record in user_data['data']: # for line in data file
            trial = record['trialdata']
            if trial['phase']=='TEST':
                if trial['hit']==True:
                    bonus += 0.02
        user.bonus = bonus
        db_session.add(user)
        db_session.commit()
        resp = {"bonusComputed": "success"}
        return jsonify(**resp)
    except:
        abort(404)  # again, bad to display HTML, but...
