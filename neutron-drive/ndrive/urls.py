from django.views.generic import RedirectView
from django.conf.urls import patterns, include, url

urlpatterns = patterns('',
  (r'^favicon.ico', RedirectView.as_view(url='/static/favicon.ico')),
  
  url(r'^edit/shatner$', 'ndrive.main.views.shatner', name='shatner'),
  url(r'^edit$', 'ndrive.main.views.edit', name='edit'),
  url(r'^file_tree$', 'ndrive.main.views.file_tree', name='file_tree'),
  url(r'^prefs$', 'ndrive.main.views.prefs', name='prefs'),
  url(r'^save_session$', 'ndrive.main.views.save_session', name='save_session'),
  url(r'^reauth$', 'ndrive.main.views.reauth', name='reauth'),
  url(r'^pre_reauth$', 'ndrive.main.views.pre_reauth', name='pre_reauth'),
  
  url(r'^about$', 'ndrive.main.views.about', name='about'),
  url(r'^license$', 'ndrive.main.views.license', name='license'),
  url(r'^iframe_share$', 'ndrive.main.views.iframe_share', name='iframe_share'),
  
  url(r'^google442b861f8353f428.html$', 'ndrive.main.views.verify', name='verify'),
  url(r'^$', 'ndrive.main.views.home', name='home'),
  
  # url(r'^ndrive/', include('ndrive.foo.urls')),
)
