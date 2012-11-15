import logging
import json
import httplib2
import chardet

from django import http

from apiclient.discovery import build

ALL_SCOPES = (
  'https://www.googleapis.com/auth/drive '
  'https://www.googleapis.com/auth/userinfo.email '
  'https://www.googleapis.com/auth/userinfo.profile '
  'https://www.googleapis.com/auth/drive.install'
)

def get_or_create (Model, queries, defaults={}):
  query = Model.all()
  for q in queries:
    query.filter(*q)
    
  entity = query.get()
  if entity:
    created = False
    
  else:
    created = True
    entity = Model(**defaults)
    
  return created, entity
  
def JsonResponse (data={'status': 'ok'}, ok=None):
  if ok:
    data.update(ok)
    
  try:
    dump = json.dumps(data)
    
  except UnicodeDecodeError:
    encoding = ''
    if data.has_key('file') and data['file'].has_key('content'):
      encoding = chardet.detect(data['file']['content'])['encoding']
      
    elif data.has_key('text'):
      encoding = chardet.detect(data['text'])['encoding']
      
    elif data.has_key('text1'):
      encoding = chardet.detect(data['text1'])['encoding']
      
    if encoding:
      data['encoding'] = encoding
      dump = json.dumps(data, encoding=encoding)
      
    else:
      raise
      
  return http.HttpResponse(dump, content_type='application/json')
  
def CreateService (service, version, creds):
  http = httplib2.Http()
  creds.authorize(http)
  return build(service, version, http=http)
  