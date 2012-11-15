import datetime

from google.appengine.ext import db

from .models import Preferences

def MigratePrefs ():
  now = datetime.datetime.utcnow()
  cursor = None
  q = Preferences.all()
  
  while 1:
    if cursor:
      q.with_cursor(start_cursor=cursor)
      
    updated = []
    for pref in q.fetch(100):
      print pref.email
      pref.created = now
      pref.updated = now
      updated.append(pref)
      
    if len(updated) == 0:
      break
    
    db.put(updated)
    cursor = q.cursor()
    
  print 'Complete'
  return 0
  