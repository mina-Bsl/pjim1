import requests
import gluon.contrib.simplejson

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def index():
    return gluon.contrib.simplejson.dumps("index()")

def imgt():
    if request.env.request_method == "POST":
        payload = dict(request.post_vars)
        
        if 'Session' in payload.keys():
            del payload['Session']
        response = requests.post("http://www.imgt.org/IMGT_vquest/vquest", data=payload)
        if response.status_code == requests.codes.ok:
            return response
        return gluon.contrib.simplejson.dumps("the site returned an invalid response")
    return gluon.contrib.simplejson.dumps("improper method")
   


