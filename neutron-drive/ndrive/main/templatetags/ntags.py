import re
import hashlib

from django import template
from django.conf import settings

from ndrive.compile_static import COMPILES

register = template.Library()

@register.filter
def removeDeci (value):
  value = value.replace("T", " ")
  value = value.replace("Z", "")
  value = re.sub("\.\d+", "", value)
  return value
  
@register.filter
def hashstr (value):
  return hashlib.sha256(value).hexdigest()
  
@register.filter
def js_bool (value):
  if value:
    return 'true'
    
  return 'false'
  
@register.simple_tag
def compiled (key):
  if settings.DEBUG:
    ret = ''
    for f in COMPILES[key]['files']:
      if COMPILES[key]['type'] == 'js':
        ret += '<script src="%s%s" type="text/javascript"></script>\n' % (settings.STATIC_URL, f)
        
    return ret
    
  path = settings.STATIC_URL + 'compressed/' + key + '.' + COMPILES[key]['type']
  if COMPILES[key]['type'] == 'js':
    return '<script src="%s" type="text/javascript"></script>' % path
    