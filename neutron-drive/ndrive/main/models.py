from google.appengine.ext import db

from oauth2client.appengine import CredentialsProperty

class Credentials (db.Model):
  credentials = CredentialsProperty()
  created = db.DateTimeProperty(auto_now_add=True)
  updated = db.DateTimeProperty(auto_now=True, required=False)
  
ETHEMES = (
  ('textmate', 'TextMate'),
  ('ambiance', 'Ambiance'),
  ('eclipse', 'Eclipse'),
  ('dawn', 'Dawn'),
  ('dreamweaver', 'Dreamweaver'),
  ('github', 'Github'),
  ('idle_fingers', 'idleFingers'),
  ('pastel_on_dark', 'Pastel on dark'),
  ('twilight', 'Twilight'),
  ('clouds', 'Clouds'),
  ('clouds_midnight', 'Clouds Midnight'),
  ('crimson_editor', 'Crimson'),
  ('kr_theme', 'krTheme'),
  ('mono_industrial', 'Mono Industrial'),
  ('monokai', 'Monokai'),
  ('merbivore', 'Merbivore'),
  ('merbivore_soft', 'Merbivore Soft'),
  ('vibrant_ink', 'Vibrant Ink'),
  ('solarized_dark', 'Solarized Dark'),
  ('solarized_light', 'Solarized Light'),
  ('tomorrow', 'Tomorrow'),
  ('tomorrow_night', 'Tomorrow Night'),
  ('tomorrow_night_blue', 'Tomorrow Night Blue'),
  ('tomorrow_night_bright', 'Tomorrow Night Bright'),
  ('tomorrow_night_eighties', 'Tomorrow Night 80\'s'),
  ('xcode', 'XCode')
)

ESIZES = (
  ('6px', '6px'),
  ('7px', '7px'),
  ('8px', '8px'),
  ('9px', '9px'),
  ('10px', '10px'),
  ('11px', '11px'),
  ('12px', '12px'),
  ('13px', '13px'),
  ('14px', '14px'),
  ('15px', '15px'),
  ('16px', '16px'),
  ('17px', '17px'),
  ('18px', '18px'),
  ('19px', '19px'),
  ('20px', '20px'),
  ('21px', '21px'),
  ('22px', '22px'),
  ('23px', '23px'),
  ('24px', '24px'),
)

EKBINDS = (
  ('ace', 'Ace'),
  ('vim', 'Vim'),
  ('emacs', 'Emacs')
)

EWRAPS = (
  ('off', 'Off'),
  ('40', '40 Chars'),
  ('80', '80 Chars'),
  ('free', 'Free')
)

class Preferences (db.Model):
  userid = db.StringProperty()
  email = db.EmailProperty()
  
  theme = db.StringProperty('Editor Theme', default='textmate')
  fontsize = db.StringProperty('Font Size', default='12px')
  keybind = db.StringProperty('Key Bindings', default='ace')
  swrap = db.StringProperty('Soft Wrap', default='off')
  
  tabsize = db.IntegerProperty('Tab Size', default=4)
  
  hactive = db.BooleanProperty('Highlight Active Line', default=True)
  hword = db.BooleanProperty('Highlight Selected Word', default=True)
  invisibles = db.BooleanProperty('Show Invisibles', default=False)
  gutter = db.BooleanProperty('Show Gutter', default=True)
  pmargin = db.BooleanProperty('Show Print Margin', default=True)
  softab = db.BooleanProperty('Use Soft Tab', default=True)
  behave = db.BooleanProperty('Enable Behaviors', default=True)
  
  save_session = db.BooleanProperty('Save Session', default=True)
  auto_save = db.BooleanProperty('Auto Save', default=True)
  
  session = db.TextProperty(required=False)
  
  created = db.DateTimeProperty(auto_now_add=True)
  updated = db.DateTimeProperty(auto_now=True)
  
class FileOpen (db.Model):
  userid = db.StringProperty()
  fileid = db.StringProperty()
  filename = db.StringProperty()
  created = db.DateTimeProperty(auto_now_add=True)
  