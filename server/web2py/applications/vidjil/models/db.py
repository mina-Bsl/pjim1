# -*- coding: utf-8 -*-

import defs
from gluon import current
from gluon.custom_import import track_changes; track_changes(True)
# AUTODELETE should be set to False before any maintenance operation on the DB
AUTODELETE = True

# Length of the upload field
LENGTH_UPLOAD = 400

#########################################################################
## This scaffolding model makes your app work on Google App Engine too
## File is released under public domain and you can use without limitations
#########################################################################

## if SSL/HTTPS is properly configured and you want all HTTP requests to
## be redirected to HTTPS, uncomment the line below:
request.requires_https()

if not request.env.web2py_runtime_gae:
    ## if NOT running on Google App Engine use SQLite or other DB
    db = DAL(defs.DB_ADDRESS,pool_size=1,check_reserved=['all'])
    ## db = DAL('mysql://root:password@localhost/vidjil5',pool_size=1,check_reserved=['all'])
else:
    ## connect to Google BigTable (optional 'google:datastore://namespace')
    db = DAL('google:datastore')
    ## store sessions and tickets there
    session.connect(request, response, db=db)
    ## or store session in Memcache, Redis, etc.
    ## from gluon.contrib.memdb import MEMDB
    ## from google.appengine.api.memcache import Client
    ## session.connect(request, response, db = MEMDB(Client()))

## by default give a view/generic.extension to all actions from localhost
## none otherwise. a pattern can be 'controller/function.extension'
response.generic_patterns = ['*'] if request.is_local else []
## (optional) optimize handling of static files
# response.optimize_css = 'concat,minify,inline'
# response.optimize_js = 'concat,minify,inline'

#########################################################################
## Here is sample code if you need for
## - email capabilities
## - authentication (registration, login, logout, ... )
## - authorization (role based authorization)
## - services (xml, csv, json, xmlrpc, jsonrpc, amf, rss)
## - old style crud actions
## (more options discussed in gluon/tools.py)
#########################################################################

from gluon.tools import Auth, Crud, Service, PluginManager, prettydate
auth = VidjilAuth(db)

crud, service, plugins = Crud(db), Service(), PluginManager()

## create all tables needed by auth if not custom tables
auth.define_tables(username=False, signature=False)

## configure email
mail = auth.settings.mailer
mail.settings.server = defs.SMTP_SERVER
mail.settings.sender = defs.FROM_EMAIL
mail.settings.login = None

## configure auth policy
auth.settings.registration_requires_verification = False
auth.settings.registration_requires_approval = False
auth.settings.reset_password_requires_verification = True

# auth.settings.login_email_validate = False
auth.settings.expiration = 3600 * 24 * 7  # one week
auth.settings.remember_me_form = False
auth.settings.logged_url = URL('user', 'info')
auth.settings.login_next = URL('user', 'info')

## if you need to use OpenID, Facebook, MySpace, Twitter, Linkedin, etc.
## register with janrain.com, write your domain:api_key in private/janrain.key
from gluon.contrib.login_methods.rpx_account import use_janrain
use_janrain(auth, filename='private/janrain.key')

#########################################################################
## Define your tables below for example
##
## >>> db.define_table('mytable',Field('myfield','string'))
##
## Fields can be 'string','text','password','integer','double','boolean'
##       'date','time','datetime','blob','upload', 'reference TABLENAME'
## There is an implicit 'id integer autoincrement' field
## Consult manual for more options, validators, etc.
##
## More API examples for controllers:
##
## >>> db.mytable.insert(myfield='value')
## >>> rows=db(db.mytable.myfield=='value').select(db.mytable.ALL)
## >>> for row in rows: print row.id, row.myfield
#########################################################################



db.define_table('sample_set',
               Field('sample_type', 'string', ondelete='SET NULL'))


db.define_table('patient',
                Field('first_name','string'),
                Field('last_name','string'),
                Field('birth','date'),
                Field('info','text'),
                Field('id_label','string'),
                Field('creator','reference auth_user'),
                Field('sample_set_id','reference sample_set', ondelete='SET NULL'))

'''
db.patient.first_name.requires = IS_NOT_EMPTY( error_message='input needed' )
db.patient.last_name.requires = IS_NOT_EMPTY( error_message='input needed' )
db.patient.birth.requires = IS_DATE(format=T('%Y-%m-%d'),
                   error_message='must be YYYY-MM-DD!')
'''

db.define_table('run',
                Field('name','string'),
                Field('run_date','date'),
                Field('info','text'),
                Field('id_label','string'),
                Field('creator','reference auth_user'),
				Field('sequencer','string'),
				Field('pcr','string'),
                Field('sample_set_id','reference sample_set', ondelete='SET NULL'))


db.define_table('pre_process',
                Field('name', 'string'),
                Field('command', 'string'),
                Field('info','text'))


db.define_table('sequence_file',
                Field('patient_id', 'reference patient'),
                Field('sampling_date','date'),
                Field('info','text'),
                Field('filename','text'),
                Field('pcr','text'),
                Field('sequencer','text'),
                Field('producer','text'),
                Field('size_file','integer', default=0),
                Field('size_file2','integer', default=0),
                Field('provider','reference auth_user'),
                Field('pre_process_id', 'reference pre_process'),
                Field('pre_process_result', 'text'),
                Field('pre_process_flag', 'text'),
                Field('pre_process_scheduler_task_id', 'integer'),
                Field('data_file', 'upload', 
                      uploadfolder=defs.DIR_SEQUENCES,
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE),
                Field('data_file2', 'upload', 
                      uploadfolder=defs.DIR_SEQUENCES,
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))





db.define_table('config',
                Field('name', 'string'),
                Field('program', 'string'),
                Field('command', 'string'),
                Field('fuse_command', 'string'),
                Field('info','text'))


db.define_table('results_file',
                Field('sequence_file_id', 'reference sequence_file'),
                Field('config_id', 'reference config'),
                Field('run_date','datetime'),
                Field('scheduler_task_id', 'integer'),
                Field('data_file', 'upload', 
                      uploadfolder=defs.DIR_RESULTS,
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))


db.define_table('fused_file',
                Field('patient_id', 'reference patient'),
                Field('config_id', 'reference config'),
                Field('sample_set_id', 'reference sample_set', ondelete='SET NULL'),
                Field('fuse_date','datetime', default="1970-01-01 00:00:00"),
                Field('status', 'string'),
                Field('sequence_file_list', 'string'),
                Field('fused_file', 'upload', 
                      uploadfolder=defs.DIR_RESULTS,
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))

db.define_table('analysis_file',
                Field('patient_id', 'reference patient'),
                Field('config_id', 'reference config'),
                Field('sample_set_id', 'reference sample_set', ondelete='SET NULL'),
                Field('analyze_date','datetime'),
                Field('status', 'string'),
                Field('analysis_file', 'upload', 
                      uploadfolder=defs.DIR_RESULTS,
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))

db.define_table('notification',
				Field('creator', 'integer'),
				Field('title', 'string'),
				Field('message_content', 'text'),
				Field('message_type', 'string'),
				Field('priority', 'string'),
				Field('expiration', 'date'),
                                Field('creation_datetime', 'datetime'))

db.define_table('user_preference',
		Field('user_id', 'reference auth_user'),
		Field('preference', 'string'),
		Field('val', 'string'))


db.define_table('sample_set_membership',
               Field('sample_set_id','reference sample_set', ondelete='SET NULL'),
               Field('sequence_file_id', 'reference sequence_file', ondelete='SET NULL'))




## after defining tables, uncomment below to enable auditing
auth.enable_record_versioning(db)

## Reverse IP

ips = {}

try:
    for l in open(defs.REVERSE_IP):
        ip, kw = l.split()
        ips[ip] = kw
except:
    pass


## Logging

import logging

logging.ADMIN = logging.INFO + 1
logging.addLevelName(logging.ADMIN, 'ADMIN')

class MsgUserAdapter(logging.LoggerAdapter):

    def process(self, msg, kwargs):
        if type(msg) is dict:
            if 'message' in msg:
                msg = msg['message']
            else:
                msg = '?'
        ip = request.client
        if ip:
            for ip_prefix in ips:
                if ip.startswith(ip_prefix):
                    ip = "%s/%s" % (ip, ips[ip_prefix])

        usern = auth.user.first_name.replace(' ','-') if auth.user else ''
        if auth.is_impersonating():
            usern = 'team!' + usern
        new_msg =  '%30s %12s %s' % (ip, ('<%s>' % usern), msg)
        return new_msg, kwargs
    
    def admin(self, msg):
        self.log(logging.ADMIN, msg)
#

def _init_log():
    """
    adapted from http://article.gmane.org/gmane.comp.python.web2py/11091
    """

    import logging
    import sys

    def create_handler(filename, level):
        try:
            handler = logging.FileHandler(filename)
        except:
            handler = logging.StreamHandler(sys.stderr)
        else:
            handler.setLevel(level)
            handler.setFormatter(formatter)
        return handler

    logger = logging.getLogger('vidjil') # (request.application)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter('[%(process)d] %(asctime)s %(levelname)8s - %(filename)s:%(lineno)d\t%(message)s')

        logger.addHandler(create_handler(defs.LOG_DEBUG, logging.DEBUG))
        logger.addHandler(create_handler(defs.LOG_INFO, logging.INFO))

        logger.debug("Creating logger")
    return MsgUserAdapter(logger, {})

log = _init_log()

auth.preload()

current.log = log
current.db = db
current.auth = auth
