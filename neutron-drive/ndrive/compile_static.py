#!/usr/bin/env python

import os
import sys

SFILE = __file__
SPATH = os.path.normpath(os.path.dirname(SFILE))
PPATH = os.path.abspath(os.path.join(SPATH, '..'))

COMPILES = {
  'footer': {
    'type': 'js',
    'files': (
      "js/jquery.js",
      "bootstrap/js/bootstrap.js",
      "js/jqueryFileTree/jqueryFileTree.js",
      "js/md5.js",
      "js/boring_stuff.js",
      "js/tabs.js",
      "js/search.js",
      "js/default.js",
      "js/calls.js",
      "js/diffview.js",
      "js/difflib.js",
    )
  }
}

if __name__ == '__main__':
  for key, value in COMPILES.items():
    compiled = os.path.join(PPATH, 'static', 'compressed', key + '.' + value['type'])
    new_file = open(compiled, 'w')
    for f in value['files']:
      fp = os.path.join(PPATH, 'static', f)
      old_file = open(fp, 'r')
      
      if value['type'] == 'js':
        new_file.write('/* FILE: %s */\n\n' % f)
        
      new_file.write(old_file.read())
      new_file.write('\n\n')
      
    new_file.close()
    