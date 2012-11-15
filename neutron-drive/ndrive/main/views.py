import os
import json
import logging
import datetime
import mimetypes
from collections import OrderedDict
import chardet

mimetypes.init()

from django import http
from django.conf import settings
from django.template.response import TemplateResponse
from django.core.urlresolvers import reverse
from django.template.loader import render_to_string

from oauth2client.client import OAuth2WebServerFlow
from oauth2client.client import FlowExchangeError
from oauth2client.client import AccessTokenRefreshError

from oauth2client.appengine import StorageByKeyName
from oauth2client.appengine import simplejson as json

from apiclient.http import MediaInMemoryUpload

from ndrive.main.models import Credentials, Preferences, ETHEMES, ESIZES, EKBINDS, EWRAPS, FileOpen
from ndrive.main.utils import JsonResponse, CreateService, ALL_SCOPES, get_or_create
from ndrive.settings.editor import MODES, THEMES

def verify (request):
  return TemplateResponse(request, 'google442b861f8353f428.html', {})
  
def iframe_share (request):
  return TemplateResponse(request, 'main/iframe_share.html', {})
  
def home (request):
  c = {
    'NDEBUG': settings.NDEBUG
  }
  return TemplateResponse(request, 'main/home.html', c)
  
def about (request):
  return TemplateResponse(request, 'main/about.html', {})
  
def license (request):
  return TemplateResponse(request, 'main/license.html', {})
  
class DriveAuth (object):
  def __init__ (self, request):
    self.request = request
    self.userid = None
    
  def CreateOAuthFlow (self):
    uri = 'http://' + self.request.get_host()
    if self.request.is_secure():
      uri = 'https://' + self.request.get_host()
      
    redirect_uri = uri + self.request.path
    
    flow = OAuth2WebServerFlow(
      settings.GOOGLE_API_CLIENT_ID,
      settings.GOOGLE_API_CLIENT_SECRET,
      '',   # scope
      redirect_uri=redirect_uri,
      user_agent=None,
      auth_uri=settings.GOOGLE_AUTH_URI,
      token_uri=settings.GOOGLE_TOKEN_URI
    )
    
    return flow
    
  def get_credentials (self, check_cookie=True):
    if check_cookie:
      creds = self.get_session_credentials()
      if creds:
        return creds
        
    code = self.request.REQUEST.get('code', '')
    if not code:
      return None
      
    oauth_flow = self.CreateOAuthFlow()
    
    try:
      creds = oauth_flow.step2_exchange(code)
      
    except FlowExchangeError:
      return None
      
    users_service = CreateService('oauth2', 'v2', creds)
    info = users_service.userinfo().get().execute()
    self.userid = info.get('id')
    email = info.get('email')
    created, self.prefs = get_or_create(Preferences, queries=(('userid =', self.userid),), defaults={'userid': self.userid, 'email': email})
    if created:
      self.prefs.put()
      
    StorageByKeyName(Credentials, self.userid, 'credentials').put(creds)
    return creds
    
  def get_session_credentials (self):
    userid = self.request.get_signed_cookie(settings.USERID_COOKIE, default=None, salt=settings.SALT)
    if userid:
      creds = StorageByKeyName(Credentials, userid, 'credentials').get()
      if creds and creds.invalid:
        return None
        
      self.userid = userid
      self.prefs = Preferences.all().filter('userid =', self.userid).get()
      return creds
      
    return None
    
  def redirect_auth (self):
    flow = self.CreateOAuthFlow()
    flow.scope = ALL_SCOPES
    uri = flow.step1_get_authorize_url()
    return http.HttpResponseRedirect(uri)
    
def pre_reauth (request):
  return TemplateResponse(request, 'main/reauth_pre.html', {})
  
def reauth (request):
  da = DriveAuth(request)
  creds = da.get_credentials(check_cookie=False)
  
  if creds is None:
    return da.redirect_auth()
    
  response = TemplateResponse(request, 'main/reauth.html', {})
  expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=settings.MAX_AGE)
  response.set_signed_cookie(
    settings.USERID_COOKIE,
    value=da.userid,
    salt=settings.SALT,
    expires=expires,
    secure=settings.CSRF_COOKIE_SECURE,
    httponly=False,
  )
  return response
  
def edit (request):
  error = request.REQUEST.get('error', '')
  if error == 'access_denied':
    return TemplateResponse(request, 'main/access_denied.html', {})
    
  da = DriveAuth(request)
  creds = da.get_credentials(check_cookie=False)
  
  if creds is None:
    return da.redirect_auth()
    
  state = request.REQUEST.get('state', '')
  open_ids = []
  new_in = None
  
  if state:
    state = json.loads(state)
    if state["action"] == 'open':
      if "exportIds" in state:
        return TemplateResponse(request, 'main/not_supported.html', {})
        
      elif "ids" in state:
        open_ids = state["ids"]
        
    elif state["action"] == 'create' and "parentId" in state:
      new_in = state['parentId']
      
  if da.prefs.save_session and da.prefs.session:
    for oid in da.prefs.session.split(','):
      if oid not in open_ids:
        open_ids.append(oid)
        
  recent_files = OrderedDict()
  for f in FileOpen.all().filter("userid =", da.userid).order("-created").fetch(30):
    if f.fileid not in recent_files:
      recent_files[f.fileid] = f.filename
      if len(recent_files) >= 10:
        break
      
  c = {
    'MODES': MODES,
    'NDEBUG': settings.NDEBUG,
    'CLIENT_ID': settings.GOOGLE_API_CLIENT_ID.split('.')[0],
    'prefs': da.prefs,
    'themes': ETHEMES,
    'sizes': ESIZES,
    'binds': EKBINDS,
    'wraps': EWRAPS,
    'open_ids': open_ids,
    'new_in': new_in,
    'recent_files': recent_files
  }
  response = TemplateResponse(request, 'main/edit.html', c)
  
  expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=settings.MAX_AGE)
  response.set_signed_cookie(
    settings.USERID_COOKIE,
    value=da.userid,
    salt=settings.SALT,
    expires=expires,
    secure=settings.CSRF_COOKIE_SECURE,
    httponly=False,
  )
  return response
  
def prefs (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  
  if creds is not None:
    da.prefs.theme = request.POST.get('theme')
    da.prefs.fontsize = request.POST.get('fontsize')
    da.prefs.keybind = request.POST.get('keybind')
    da.prefs.swrap = request.POST.get('swrap')
    
    da.prefs.tabsize = int(request.POST.get('tabsize'))
    
    da.prefs.hactive = request.POST.get('hactive') == 'true'
    da.prefs.hword = request.POST.get('hword') == 'true'
    da.prefs.invisibles = request.POST.get('invisibles') == 'true'
    da.prefs.gutter = request.POST.get('gutter') == 'true'
    da.prefs.pmargin = request.POST.get('pmargin') == 'true'
    da.prefs.softab = request.POST.get('softab') == 'true'
    da.prefs.behave = request.POST.get('behave') == 'true'
    
    da.prefs.save_session = request.POST.get('save_session') == 'true'
    da.prefs.auto_save = request.POST.get('auto_save') == 'true'
    
    da.prefs.put()
    
    return JsonResponse()
    
  return JsonResponse({'status': 'auth_needed'})
  
def save_session (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  if creds is not None:
    files = request.POST.get('files', '')
    da.prefs.session = files
    da.prefs.put()
    
    return JsonResponse()
    
def shatner (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  if creds is None:
    return JsonResponse({'status': 'auth_needed'})
    
  task = request.POST.get('task', '')
  service = CreateService('drive', 'v2', creds)
  
  if service is None:
    return JsonResponse({'status': 'no_service'})
    
  if task == 'delete':
    file_id = request.POST.get('file_id', '')
    fid = file_id
    if file_id.endswith('/'):
      fid = file_id[:-1]
      
    try:
      service.files().trash(fileId=fid).execute()
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    return JsonResponse({'status': 'ok', 'file_id': file_id})
    
  elif task == 'revs':
    file_id = request.POST.get('file_id', '')
    try:
      revisions = service.revisions().list(fileId=file_id).execute()
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    else:
      #for item in revisions.get('items', []):
      #  logging.info('PIN: ' + str(item['pinned']))
      #  logging.info('PUB: ' + str(item['published']))
      #  
      html = render_to_string('main/revs.html', {'file_id': file_id, 'items': revisions.get('items', [])})
      
    return JsonResponse({'status': 'ok', 'file_id': file_id, 'html': html})
    
  elif task == 'get_url':
    file_id = request.POST.get('file_id', '')
    url = request.POST.get('url', '')
    
    try:
      resp, content = service._http.request(url)
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    return JsonResponse({'status': 'ok', 'file_id': file_id, 'text': content})
    
  elif task == 'get_urls':
    file_id = request.POST.get('file_id', '')
    url1 = request.POST.get('url1', '')
    url2 = request.POST.get('url2', '')
    
    try:
      resp1, content1 = service._http.request(url1)
      resp2, content2 = service._http.request(url2)
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    return JsonResponse({'status': 'ok', 'file_id': file_id, 'text1': content1, 'text2': content2})
    
  elif task == 'open':
    file_id = request.POST.get('file_id', '')
    if file_id:
      try:
        f = service.files().get(fileId=file_id).execute()
        
      except AccessTokenRefreshError:
        return JsonResponse({'status': 'auth_needed'})
        
      downloadUrl = f.get('downloadUrl')
      
      if downloadUrl:
        resp, f['content'] = service._http.request(downloadUrl)
        
      else:
        f['content'] = ''
        
      fo = FileOpen(userid=da.userid, fileid=file_id, filename=f['title'])
      fo.put()
      return JsonResponse({'status': 'ok', 'file': f})
      
    return JsonResponse({'status': 'Invalid File'})
    
  elif task == 'save':
    name = request.POST.get('name')
    mimetype = request.POST.get('mimetype')
    content = request.POST.get('content', '')
    file_id = request.POST.get('file_id', '')
    new_file = request.POST.get('new_file')
    major = request.POST.get('major', '')
    md5hash = request.POST.get('md5hash', '')
    undos = int(request.POST.get('undos', '0'))
    
    new_revision = False
    if major == 'true':
      new_revision = True
      
    resource = {
      'title': name,
      'mimeType': mimetype
    }
    
    encoding = chardet.detect(content)['encoding']
    dump = None
    if encoding:
      try:
        dump = content.encode(encoding)
        
      except:
        dump = None
        
    if dump is None:
      dump = content.encode('utf-8')
      
    file = MediaInMemoryUpload(dump, mimetype)
    try:
      if new_file == 'false':
        google = service.files().update(fileId=file_id, newRevision=new_revision, body=resource, media_body=file).execute()
        
      else:
        google = service.files().insert(body=resource, media_body=file).execute()
        
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    else:
      file_id = google['id']
      
    return JsonResponse(ok={'file_id': file_id, 'md5hash': md5hash, 'undos': undos})
    
  elif task == 'rename':
    name = request.POST.get('name')
    file_id = request.POST.get('file_id', '')
    rtype = request.POST.get('rtype', '')
    
    resource = {'title': name}
    if rtype == 'd':
      file_id = file_id[:-1]
      resource['mimeType'] = 'application/vnd.google-apps.folder'
      
    else:
      newm, enc = mimetypes.guess_type(name)
      if newm:
        resource['mimeType'] = newm
        
    google = service.files().update(fileId=file_id, newRevision=True, body=resource).execute()
    parents = []
    for p in google['parents']:
      if p['isRoot']:
        parents.append('')
        
      else:
        parents.append(p['id'])
        
    if not parents:
      parents.append('')
      
    return JsonResponse(ok={'file_id': file_id, 'parents': parents, 'name': name})
    
  elif task == 'new':
    name = request.POST.get('name')
    parent = request.POST.get('parent', '')
    
    mime_type, enc = mimetypes.guess_type(name)
    root, ext = os.path.splitext(name)
    if not mime_type:
      mime_type = 'application/octet-stream'
      
    if ext:
      ext = ext[1:]
      
    media_body = MediaInMemoryUpload('', mime_type)
    body = {
      'title': name,
      'mimeType': mime_type
    }
    
    if parent:
      body['parents'] = [{'id': parent}]
      
    try:
      google = service.files().insert(body=body, media_body=media_body).execute()
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    else:
      return JsonResponse(ok={'file_id': google['id'], 'title': name, 'ext': ext, 'mime': mime_type, 'url': google['alternateLink'], 'parent': parent})
      
  elif task == 'new_dir':
    name = request.POST.get('name')
    parent = request.POST.get('parent', '')
    dmt = 'application/vnd.google-apps.folder'
    
    body = {'title': name, 'mimeType': dmt}
    
    if parent:
      body['parents'] = [{'id': parent}]
      
    try:
      google = service.files().insert(body=body).execute()
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    else:
      return JsonResponse(ok={'file_id': google['id'], 'title': name, 'mime': dmt, 'parent': parent})
        
  return http.HttpResponseBadRequest('Invalid Task', mimetype='text/plain')
  
def file_tree (request):
  #return JsonResponse({'status': 'auth_needed'})
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  if creds is None:
    return JsonResponse({'status': 'auth_needed'})
    
  service = CreateService('drive', 'v2', creds)
  d = request.POST.get('dir', '')
  dirs = [] 
  flist = []
  page_token = None
  
  while 1:
    param = {}  
    if page_token:
      param['pageToken'] = page_token
      
    if d:
      #if d == 'shared_with_me/':
      #  param['q'] = "not 'me' in owners and ('me' in writers or 'me' in readers)"
      #  
      #else:
      param['q'] = "'%s' in parents" % d[:-1]
      
    else:
      param['q'] = "'root' in parents"
      
    try:
      files = service.files().list(**param).execute()
      
    except AccessTokenRefreshError:
      return JsonResponse({'status': 'auth_needed'})
      
    file_items = files.get('items', [])
    
    for f in file_items:
      if f.has_key('labels') and f['labels']['trashed']:
        continue
      
      f['ext'] = ''
      
      if f.has_key('fileExtension'):
        f['ext'] = f['fileExtension']
        
      isDir = False
      if f['ext'] == '' and f.has_key('mimeType') and f['mimeType'] == 'application/vnd.google-apps.folder':
        isDir = True
        
      if isDir:
        dirs.append((f['title'], '<li id="dir_%(id)s" class="directory collapsed" title="%(title)s"><a href="#" rel="%(id)s/" data-mime="%(mimeType)s" data-title="%(title)s" onclick="hide_right_menu()" oncontextmenu="return right_menu(event, \'dir\', \'%(id)s/\')">%(title)s</a></li>' % f))
        
      else:
        flist.append((f['title'], '<li class="file ext_%(ext)s"><a href="#" rel="%(id)s" data-title="%(title)s" data-url="%(alternateLink)s" data-mime="%(mimeType)s" data-ext="%(ext)s" onclick="hide_right_menu()" oncontextmenu="return right_menu(event, \'file\', \'%(id)s\')">%(title)s</a></li>' % f))
        
    page_token = files.get('nextPageToken')
    if not page_token:
      break
    
  flist = sorted(flist, key=lambda x: x[0].lower())
  dirs = sorted(dirs, key=lambda x: x[0].lower())
  
  if not d:
    pass
    #f = {
    #  'title': 'Shared With Me',
    #  'mimeType': 'application/vnd.google-apps.folder',
    #  'id': 'shared_with_me',
    #}
    #dirs.insert(0, (f['title'], '<li id="dir_%(id)s" class="directory collapsed" title="%(title)s"><a href="#" rel="%(id)s/" data-mime="%(mimeType)s" data-title="%(title)s" onclick="hide_right_menu()" oncontextmenu="return right_menu(event, \'dir\', \'%(id)s/\')">%(title)s</a></li>' % f))
    
  dirs = [y for (x, y) in dirs if True]
  flist = [y for (x, y) in flist if True]
  
  r = ['<ul class="jqueryFileTree" style="display: none;">'] + dirs + flist + ['</ul>']
  return http.HttpResponse(''.join(r))
  