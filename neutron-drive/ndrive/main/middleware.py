import logging
import exceptions

from django import http
from django.conf import settings
from django.core.urlresolvers import reverse
from django.middleware.csrf import get_token

from ndrive.main.utils import JsonResponse

class SSL (object):
  def process_request (self, request):
    if settings.CSRF_COOKIE_SECURE and request.path != '/google442b861f8353f428.html':
      if not request.is_secure():
        url = request.build_absolute_uri().replace('http://', 'https://')
        return http.HttpResponseRedirect(url)
        
class DriveAuth (object):
  def process_request (self, request):
    if request.method == 'GET':
      get_token(request)
      
    request.static_url = settings.STATIC_URL
    
    http = 'http://'
    if request.is_secure():
      http = 'https://'
      
    request.redirect_uris = (http + request.get_host() + reverse('edit'))
    