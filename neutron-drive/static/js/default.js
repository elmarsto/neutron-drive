window.onbeforeunload = function() {
  for (i in Tabs.files) {
    var file_id = Tabs.files[i];
    content = Tabs.data[file_id].session.getValue();
    md5hash = md5(content);
    
    if (md5hash != Tabs.data[file_id].md5hash) {
      return 'Leaving so soon!';
    }
  }
}

var opening = [];
var pickerView = new google.picker.View(google.picker.ViewId.DOCS);
var pickerView2 = new google.picker.View(google.picker.ViewId.RECENTLY_PICKED);
var pickerView3 = new google.picker.View(google.picker.ViewId.FOLDERS);

function open_picker () {
  picker = new google.picker.PickerBuilder().
    setAppId(ndrive.CLIENT_ID).
    addView(pickerView).
    addView(pickerView2).
    addView(pickerView3).
    setCallback(pickerCallback).
    enableFeature(google.picker.Feature.MULTISELECT_ENABLED).
    build();
  picker.setVisible(true);
}

function pickerCallback (data) {
  if (data.action == google.picker.Action.PICKED) {
    var exts = Object.keys(FILE_EXTS);
    
    for (i in data.docs) {
      var file_id = data.docs[i].id;
      var name = data.docs[i].name;
      var ext = name.toLowerCase().split('.').pop();
      
      if (ext != '' && exts.indexOf(ext) >= 0) {
        file_opener(file_id);
      }
      
      else {
        $("#hiddenLinkA").attr('href', data.docs[i].url);
        $("#hiddenLink").html(name);
        $("#hiddenLink").data('id', file_id);
        $('#linkModal').modal('show');
      }
    }
  }
}

function clear_message (fid) {
  $('#message_center .message_' + fid).remove();
}

function close_all () {
  if (confirm('Are you sure you wish to close all tabs?')) {
    while (Tabs.files.length > 0) {
      Tabs.remove_tab(Tabs.files[0], true);
    }
    
    update_session();
  }
}

function getParameterByName (qs, name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(qs);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function auto_save (forced) {
  var name;
  var content;
  var md5hash;
  var major;
  
  if (forced) {
    clearTimeout(saveLoop);
  }
  
  var flist = [];
  if (PREFS.auto_save) {
    flist = Tabs.files;
  }
  
  else {
    flist = [Tabs.current_tab()];
  }
  
  for (i in flist) {
    var file_id = flist[i];
    name = Tabs.data[file_id].name;
    content = Tabs.data[file_id].session.getValue();
    md5hash = md5(content);
    major = 'false';
    
    if (forced || md5hash != Tabs.data[file_id].md5hash) {
      $('#message_center').append('<span class="message_' + file_id +'">Saving ' + name + ' ... </span>');
      var undos = Tabs.data[file_id].session.getUndoManager().$undoStack.length;
      
      if (forced || force_major || !Tabs.data[file_id].saved_once || Math.abs(undos - Tabs.data[file_id].undos) > 10) {
        major = 'true';
        force_major = false;
      }
      
      else {
        undos = Tabs.data[file_id].undos;
      }
      
      $.ajax({
        type: 'POST',
        url: ndrive.negotiator,
        data: {
          file_id: file_id,
          task: 'save',
          content: content,
          new_file: 'false',
          name: name,
          mimetype: Tabs.data[file_id].mime,
          major: major,
          md5hash: md5hash,
          undos: undos
        },
        success: function (data) {
          if (response_ok(data)) {
            Tabs.data[data.file_id].undos = data.undos;
            Tabs.data[data.file_id].md5hash = data.md5hash;
            Tabs.data[data.file_id].saved_once = true;
          }
        },
        error: function () { alert('Error saving file ' + name); },
        complete: function () {
          var fid = getParameterByName('?' + this.data, 'file_id')
          clear_message(fid);
        }
      });
    }
  }
  
  if (PREFS.auto_save) {
    saveLoop = setTimeout(function() { auto_save(); }, 5000);
  }
  
  if (forced) {
    Editor.focus();
  }
}

var saveLoop;
var EditSession = require('ace/edit_session').EditSession;
var UndoManager = require("ace/undomanager").UndoManager;
var Editor = ace.edit("ace_div");
Editor.setValue("Open or create a new file to continue.");
var force_major = false;
var revert_data = '';
set_prefs(null);

$(document).ready(function () {
  set_sizes();
  $(window).resize(function() {
    set_sizes();
  });
  
  if (jQuery.browser.mozilla) {
    $("#resizeNarf").css('display', 'none')
  }
  
  else {
    var resize = $("#resizeNarf").get(0);
    resize.addEventListener('dragend', function(event) {
      var x = event.x;
      if (x < 1) {
        x = 1;
      }
      
      $("#box_wrapper > div:first-child").width(x);
      var m = x + 9;
      $("#box_wrapper > div:last-child").css('margin-left', m + 'px');
      event.stopPropagation();
      $("#dragger").css('display', 'none');
      $('#collapse_tools').html('&#9666');
      
      setTimeout(function(){ set_sizes(); }, 0);
      setTimeout(function(){ set_sizes(); }, 100);
    }, false);
    
    resize.addEventListener('drag', function(event) {
      $("#dragger").css('display', 'block');
      $("#dragger").offset({ top: 0, left: event.x - 3});
    }, false);
  }
  
  add_commands();
  
  for (i in ndrive.initial_ids) {
    var file_id = ndrive.initial_ids[i];
    file_opener(file_id);
  }
  
  if (PREFS.auto_save) {
    saveLoop = setTimeout(function() { auto_save(); }, 3000);
  }
  
  $('#sideTabs a:first').tab('show');
  
  $('#fileTree').fileTree({root: '', script: '/file_tree'}, file_browser_open);
  
  if (ndrive.new_in) {
    $("#id_newfile_parent").val(ndrive.new_in);
    $('#newModal').modal('show');
  }
  
  $('body').click(hide_right_menu);
  
  try {
    if (chrome.app.isInstalled) {
      $('#install-button').remove();
    }
  }
  
  catch (e) {
    $('#install-button').remove();
  }
  
  document.body.addEventListener('dragover',drag_over,false); 
  document.body.addEventListener('drop',drop,false);
});

function drag_over (event) { 
    event.preventDefault(); 
    return false; 
}

function drop (event) { 
    event.preventDefault();
    return false;
}

function new_file_root () {
  $("#id_newfile_parent").val('');
  $('#newModal').modal('show');
  
  setTimeout(function(){ $("#id_newfile_name").focus().select(); }, 500);
}

function new_file_dir (fid) {
  $("#id_newfile_parent").val(fid);
  
  setTimeout(function(){ $("#id_newfile_name").focus().select(); }, 500);
}

function new_dir_dir (fid) {
  $("#id_newdir_parent").val(fid);
  
  setTimeout(function(){ $("#id_newdir_name").focus().select(); }, 500);
}

function new_dir_root () {
  $("#id_newdir_parent").val('');
  $('#newDirModal').modal('show');
  
  setTimeout(function(){ $("#id_newdir_name").focus().select(); }, 500);
}

function parse_ext (filename) {
  return filename.split('.').pop();
}

function new_file () {
  var name = $("#id_newfile_name").val();
  var parent = $("#id_newfile_parent").val();
  
  var ext = parse_ext(name);
  var ext_good = false;
  var exts = Object.keys(FILE_EXTS);
  
  if (ext != '' && exts.indexOf(ext) >= 0) {
    ext_good = true;
  }
  
  if (!ext_good) {
    if (!confirm('You entered a filename with an unsupported extension. Would you like to continue anyway?')) {
      return false;
    }
  }
  
  $('#newModal').modal('hide');
  
  $.ajax({
    type: 'POST',
    url: ndrive.negotiator,
    data: {
      task: 'new',
      parent: parent,
      name: name
    },
    success: function (data) {
      if (response_ok(data)) {
        file_browser_open(data['file_id'], data);
        refresh_parent(parent);
      }
    },
    error: function () { alert('Error creating new file.'); }
  });
  
  return false;
}

function new_dir () {
  var name = $("#id_newdir_name").val();
  var parent = $("#id_newdir_parent").val();
  $('#newDirModal').modal('hide');
  
  $.ajax({
    type: 'POST',
    url: ndrive.negotiator,
    data: {
      task: 'new_dir',
      parent: parent,
      name: name
    },
    success: function (data) {
      if (response_ok(data)) {
        refresh_parent(parent);
      }
    },
    error: function () { alert('Error creating new directory.'); }
  });
  
  return false;
}

function refresh_parent (parent) {
  if (parent) {
    var sel = '#dir_' + parent;
    if ($(sel).hasClass('expanded')) {
      $(sel + ' > a').click();
    }
    
    $(sel + ' > a').click();
  }
  
  else {
    $('#fileTree').fileTree({root: '', script: '/file_tree'}, file_browser_open);
  }
}

function file_browser_open (file_id, d) {
  if (!d) {
    d = $('a[rel="' + file_id + '"]').data();
  }
  
  var exts = Object.keys(FILE_EXTS);
  
  if (d.title.toLowerCase() == 'readme' || MIMES.indexOf(d.mime) >= 0 || (d.ext != '' && exts.indexOf(d.ext) >= 0)) {
    file_opener(file_id);
  }
  
  else {
    $("#hiddenLinkA").attr('href', d.url);
    $("#hiddenLink").html(d.title);
    $("#hiddenLink").data('id', file_id);
    $('#linkModal').modal('show');
  }
}

function file_opener (file_id) {
  if (opening.indexOf(file_id) >= 0) {
    //wait for file to open
  }
  
  else if (Tabs.files.indexOf(file_id) < 0) {
    opening.push(file_id);
    
    $.ajax({
      type: 'POST',
      url: ndrive.negotiator,
      data: {'file_id': file_id, 'task': 'open'},
      success: add_tab,
      error: open_failure,
      complete: file_complete,
      beforeSend: function (jqXHR, settings) { jqXHR.file_id = file_id; }
    });
  }
  
  else {
    Tabs.switch_tab(file_id);
  }
}

function file_complete (jqXHR, textStatus) {
  var i = opening.indexOf(jqXHR.file_id);
  opening.splice(i, 1);
}

function open_failure (jqXHR, textStatus, errorThrown) {
  alert('Error opening file.');
}

function force_open () {
  var file_id = $("#hiddenLink").data('id');
  file_opener(file_id);
  
  
  $('#linkModal').modal('toggle');
}

function response_ok (data) {
  if (data.status == 'ok') { return true; }
  else if (data.status == 'no_service') { alert('Google Drive service has been interrupted.  Please try again later.'); }
  else if (data.status == 'auth_needed') { do_reauth() }
  else {
    alert(data.status);
  }
  return false;
}

function add_tab (data, textStatus, jqXHR) {
  if (response_ok(data)) {
    //console.log(data);
    var session = new EditSession(data.file.content); 
    session.setUndoManager(new UndoManager());
    Editor.setSession(session);
    
    var mode = 'text';
    for (ext in FILE_EXTS) {
      if (ext == data.file.fileExtension) {
        mode = FILE_EXTS[ext];
      }
    }
    
    $('#recent_ul li[data-fileid^="' + data.file.id + '"]').remove();
    var html = '<li data-fileid="' + data.file.id  + '"><a href="javascript: void(0);" onclick="file_opener(\'' + data.file.id + '\')">' + data.file.title + '</a></li>';
    $('#recent_ul').prepend(html);
    if ($('#recent_ul li').length > 10) {
      $('#recent_ul li:last-child').remove();
    }
    
    $('#recent_back > div[data-fileid^="' + data.file.id + '"]').remove();
    html = '<div data-fileid="' + data.file.id  + '"><a href="javascript: void(0);" onclick="file_opener(\'' + data.file.id  + '\')" title="' + data.file.title  + '"><span>' + data.file.title  + '</span></a></div>';
    $('#recent_back').prepend(html);
    if ($('#recent_back > div').length > 10) {
      $('#recent_back > div:last-child').remove();
    }
    
    var Mode = require("ace/mode/" + mode).Mode;
    session.setMode(new Mode());
    set_sizes();
    set_prefs(session);
    Editor.focus();
    $("#emode_" + mode).get(0).checked = true;
    
    Tabs.add_file(data.file.id, data.file.title, data.file.mimeType, session, mode);
    
    update_session();
  }
}

function set_sizes () {
  var winh = $(window).height();
  var winw = $(window).width();
  var toph = $("#top_wrapper").height();
  var toolw = $("#box_wrapper > div:first-child").width();
  var tabh = $("#tab_bar").height();
  
  if (toolw <= 0) {
    toolw = 0;
  }
  var h = toph + 1 + tabh;
  $('#ace_div').width(winw - (toolw + 9));
  $('#box_wrapper > div').height(winh - (toph + 1));
  $('#box_wrapper > div:nth-child(2) > div').height(winh - (toph + 1));
  $('#ace_div').height(winh - h);
  $("#box_wrapper > div:last-child").css('margin-left', (toolw + 9) + 'px');
  
  var sideh = winh - (toph + 7 + $('#sideTabs').height());
  $('#fileTree').height(sideh);
  $('#searchSideTab').height(sideh);
  
  Editor.resize();
}

function get_editor_mode () {
  var c = Tabs.current_tab();
  if (c) {
    var mode = Tabs.data[c].mode;
    $("#emode_" + mode).get(0).checked = true;
  }
}

function set_editor_mode (mode) {
  var sess = Editor.getSession();
  var Mode = require("ace/mode/" + mode).Mode;
  sess.setMode(new Mode());
  
  $('#modeModal').modal('hide');
  
  var c = Tabs.current_tab();
  Tabs.data[c].mode = mode;
  Editor.focus();
}

function update_prefs () {
  $('#prefModal').modal('hide');
  
  PREFS.theme = $("#id_theme").val();
  PREFS.fontsize = $("#id_fontsize").val();
  PREFS.keybind = $("#id_keybind").val();
  PREFS.swrap = $("#id_swrap").val();
  PREFS.tabsize = parseInt($("#id_tabsize").val());
  
  PREFS.hactive = $("#id_hactive").get(0).checked;
  PREFS.hword = $("#id_hword").get(0).checked;
  PREFS.invisibles = $("#id_invisibles").get(0).checked;
  PREFS.gutter = $("#id_gutter").get(0).checked;
  PREFS.pmargin = $("#id_pmargin").get(0).checked;
  PREFS.softab = $("#id_softab").get(0).checked;
  PREFS.behave = $("#id_behave").get(0).checked;
  
  PREFS.save_session = $("#id_save_session").get(0).checked;
  PREFS.auto_save = $("#id_auto_save").get(0).checked;
  
  set_prefs(null);
  Editor.focus();
  
  clearTimeout(saveLoop);
  if (PREFS.auto_save) {
    saveLoop = setTimeout(function() { auto_save(); }, 5000);
  }
  
  $.ajax({
    type: 'POST',
    url: ndrive.prefs,
    data: PREFS,
    error: function () { alert('Error saving preferences'); }
  });
  
  return false;
}

function set_prefs (session) {
  if (!session) {
    session = Editor.getSession();
  }
  
  load_theme = true;
  for (i in LOADED_THEMES) {
    if (LOADED_THEMES[i] == PREFS.theme) {
      load_theme = false;
      break;
    }
  }
  
  if (load_theme) {
    $.ajax({
      url: STATIC_URL + 'ace/src-min/theme-' + PREFS.theme + '.js',
      dataType: "script",
      async: false,
    });
    LOADED_THEMES.push(PREFS.theme);
  }
  
  Editor.setTheme("ace/theme/" + PREFS.theme);
  
  var handler = null;
  if (PREFS.keybind == 'emacs') {
    handler = require("ace/keyboard/emacs").handler;
  }
  
  else if (PREFS.keybind == 'vim') {
    handler = require("ace/keyboard/vim").handler;
  }
  
  Editor.setKeyboardHandler(handler);
  
  Editor.setHighlightActiveLine(PREFS.hactive);
  Editor.setHighlightSelectedWord(PREFS.hword);
  Editor.setShowInvisibles(PREFS.invisibles);
  Editor.setBehavioursEnabled(PREFS.behave);
  
  Editor.renderer.setFadeFoldWidgets(false);
  Editor.renderer.setShowGutter(PREFS.gutter);
  Editor.renderer.setShowPrintMargin(PREFS.pmargin);
  
  session.setTabSize(PREFS.tabsize);
  session.setUseSoftTabs(PREFS.softab);
  
  switch (PREFS.swrap) {
    case "off":
      session.setUseWrapMode(false);
      Editor.renderer.setPrintMarginColumn(80);
      break;
      
    case "40":
      session.setUseWrapMode(true);
      session.setWrapLimitRange(40, 40);
      Editor.renderer.setPrintMarginColumn(40);
      break;
      
    case "80":
      session.setUseWrapMode(true);
      session.setWrapLimitRange(80, 80);
      Editor.renderer.setPrintMarginColumn(80);
      break;
      
    case "free":
      session.setUseWrapMode(true);
      session.setWrapLimitRange(null, null);
      Editor.renderer.setPrintMarginColumn(80);
      break;
  }
  
  $("#ace_wrapper #ace_div").css('font-size', PREFS.fontsize);
}

var last_width = 250;
function collapse_tools () {
  var sel = '#box_wrapper > div:first-child';
  
  if ($(sel).width() <= 0) {
    $(sel).width(last_width);
    $('#collapse_tools').html('&#9666');
  }
  
  else {
    last_width = $(sel).width();
    $(sel).width(0);
    $('#collapse_tools').html('&#9656');
  }
  
  setTimeout(function(){ set_sizes(); }, 0);
  setTimeout(function(){ set_sizes(); }, 100);
}

function add_commands () {
  Editor.commands.addCommand({
      name: 'Search',
      bindKey: {
        win: 'Ctrl-Q',
        mac: 'Command-Q',
        sender: 'editor'
      },
      exec: function(env, args, request) {
        $('#sideTabs a:last').tab('show');
        $('#s_search').focus().select();
      }
  });
  
  Editor.commands.addCommand({
      name: 'Save',
      bindKey: {
        win: 'Ctrl-D',
        mac: 'Command-D',
        sender: 'editor'
      },
      exec: function(env, args, request) {
        auto_save(true);
      }
  });
  
  Editor.commands.addCommand({
      name: 'Do Nothing',
      bindKey: {
        win: 'Ctrl-S',
        mac: 'Command-S',
        sender: 'editor'
      },
      exec: function(env, args, request) {}
  });
  
  Editor.commands.addCommand({
      name: 'Do Nothing',
      bindKey: {
        win: 'Ctrl-W',
        mac: 'Command-W',
        sender: 'editor'
      },
      exec: function(env, args, request) {  }
  });
  
  Editor.commands.addCommand({
      name: 'Revision History',
      bindKey: {
        win: 'Ctrl-H',
        mac: 'Command-H',
        sender: 'editor'
      },
      exec: function(env, args, request) {
        rev_history();
      }
  });
}

function hide_right_menu () {
  $(".fb-right-menu").remove();
}

function right_menu (event, ftype, fid) {
  $(".fb-right-menu").remove();
  
  var y = event.y - 10;
  var x = event.x - 10;
  
  var d = $('a[rel="' + fid + '"]').data();
  
  var html = '<ul class="fb-right-menu dropdown-menu" style="display: block; position: absolute; top: ' + y + 'px; left: ' + x + 'px">';
  html = html + '<li style="padding: 3px 15px; width: 160px;">' + d['title'] + '</li>';
  html = html + '<li class="divider"></li>';
  
  if (ftype == 'file') {
    html = html + '<li><a data-toggle="modal" href="#renameModal" onclick="set_rename_file(\'' + fid + '\', \'' + escape(d['title']) + '\', \'f\')"><i class="icon-pencil"></i> Rename</a></li>';
    html = html + '<li><a href="' + d['url'] + '" target="_blank"><i class="icon-circle-arrow-up"></i> Open in Google</a></li>';
  }
  
  else {
    html = html + '<li><a data-toggle="modal" href="#renameModal" onclick="set_rename_file(\'' + fid + '\', \'' + escape(d['title']) + '\', \'d\')"><i class="icon-pencil"></i> Rename</a></li>';
    html = html + '<li><a data-toggle="modal" href="#newModal" onclick="new_file_dir(\'' + fid.slice(0, -1) + '\')"><i class="icon-file"></i> New File</a></li>';
    html = html + '<li><a data-toggle="modal" href="#newDirModal" onclick="new_dir_dir(\'' + fid.slice(0, -1) + '\')"><i class="icon-folder-open"></i> New Directory</a></li>';
    html = html + '<li><a data-toggle="modal" href="javascript: void(0);" onclick="refresh_parent(\'' + fid.slice(0, -1) + '\');"><i class="icon-refresh"></i> Refresh</a></li>';
  }
  
  html = html + '<li><a data-toggle="modal" href="javascript: void(0);" onclick="delete_file(\'' + fid + '\', \'' + escape(d['title']) + '\')"><i class="icon-trash"></i> Trash</a></li>';
  html = html + '</ul>';
  $('body').append(html);
  return false;
}

function right_tab_menu (event, fid) {
  $(".fb-right-menu").remove();
  var y = event.y - 10;
  var x = event.x - 10;
  
  var name = $('span#' + fid + ' a').html();
  var html = '<ul class="fb-right-menu dropdown-menu" style="display: block; position: absolute; top: ' + y + 'px; left: ' + x + 'px">';
  html = html + '<li style="padding: 3px 15px; width: 160px;">' + name + '</li>';
  html = html + '<li class="divider"></li>';
  html = html + '<li>\
    <a href="javascript: void(0);" onclick="Tabs.switch_tab(\'' + fid + '\', true); rev_history()" title="Ctrl-H/Cmd-H">\
      <i class="icon-tags"></i>\
      Revision History\
    </a>\
  </li>\
  <li>\
    <a data-toggle="modal" href="#modeModal" onclick="Tabs.switch_tab(\'' + fid + '\', true); get_editor_mode()">\
      <i class="icon-align-justify"></i>\
      Editor Mode\
    </a>\
  </li>';
  
  html = html + '<li><a data-toggle="modal" href="#renameModal" onclick="set_rename_file(\'' + fid + '\', \'' + escape(name) + '\', \'f\')"><i class="icon-pencil"></i> Rename</a></li>';  
  html = html + '</ul>';
  $('body').append(html);
  
  return false;
}

function set_rename_file (fid, title, rtype) {
  title = unescape(title);
  $("#id_rename_id").val(fid);
  $("#id_rename_name").val(title);
  $("#renameSpan").html(title);
  $("#id_rename_type").val(rtype);
  
  setTimeout(function(){ $("#id_rename_name").focus().select(); }, 500);
}

function rename_file () {
  $('#renameModal').modal('hide');
  
  $.ajax({
    type: 'POST',
    url: ndrive.negotiator,
    data: {file_id: $("#id_rename_id").val(), task: 'rename', name: $("#id_rename_name").val(), rtype: $("#id_rename_type").val()},
    success: function (data) {
      if (response_ok(data)) {
        $('span#' + data.file_id + ' a').html(data.name);
        for (i in data.parents) {
          refresh_parent(data.parents[i]);
        }
      }
    },
    error: function () { alert('Error renaming file.'); }
  });
  
  return false;
}

function delete_file (fid, title) {
  title = unescape(title);
  
  if (confirm('Are you sure you wish to trash ' + title + '?')) {
    $.ajax({
      type: 'POST',
      url: ndrive.negotiator,
      data: {file_id: fid, task: 'delete'},
      success: function (data) {
        if (response_ok(data)) {
          $('a[rel="' + data.file_id + '"]').parent().remove();
        }
      },
      error: function () { alert('Error deleting ' + title + '.'); }
    });
  }
}

function rev_history () {
  $('#revModal').modal('show');
  $("#revBody").html('<h2>Retrieving revision history please wait ... </h2>');
  
  var ctab = Tabs.current_tab();
  $("#revTitle").html(Tabs.data[ctab].name);
  
  $.ajax({
    type: 'POST',
    url: ndrive.negotiator,
    data: {file_id: ctab, task: 'revs'},
    success: function (data) {
      if (response_ok(data)) {
        $("#revBody").html(data.html);
      }
    },
    error: function () {
      alert('Error retrieving revisions.');
      $('#revModal').modal('hide');
    }
  });
}

function view_revision (fid, rev, url) {
  $('#revModal').modal('hide');
  $('#revViewModal').modal('show');
  $("#revViewBody").html('Retrieving revision please wait ...');
  
  var ctab = Tabs.current_tab();
  $("#revViewTitle").html(Tabs.data[ctab].name + ' - ' + rev);
  
  $.ajax({
    type: 'POST',
    url: ndrive.negotiator,
    data: {file_id: fid, task: 'get_url', 'url': url},
    success: function (data) {
      if (response_ok(data)) {
        $("#revViewBody").html(data.text);
        revert_data = data.text;
      }
    },
    error: function () {
      alert('Error retrieving revision content.');
      $('#revViewModal').modal('hide');
    }
  });
}

function revert_revision (fid, url) {
  if (confirm('Are you sure you wish to revert?')) {
    $.ajax({
      type: 'POST',
      url: ndrive.negotiator,
      data: {file_id: fid, task: 'get_url', 'url': url},
      success: function (data) {
        if (response_ok(data)) {
          Editor.getSession().setValue(data.text);
          $('#revModal').modal('hide');
          $('#revDiffModal').modal('hide');
        }
      },
      error: function () {
        alert('Error retrieving revision content.');
      }
    });
  }
}

function do_revert () {
  force_major = true;
  $('#revViewModal').modal('hide');
  Editor.getSession().setValue(revert_data);
  revert_data = '';
}

function update_session () {
  if (PREFS.save_session) {
    var flist = '';
    for (i in Tabs.files) {
      if (i != 0) {
        flist = flist + ',';
      }
      
      flist = flist + Tabs.files[i];
    }
    
    $.ajax({
      type: 'POST',
      url: ndrive.save_session,
      data: {files: flist},
      success: function () {},
      error: function () { alert('Error saving session.'); }
    });
  }
}

function do_chrome_install () {
  chrome.webstore.install('https://chrome.google.com/webstore/detail/lanjfnanlbolmgmnchmhfnicfefjgnff', function () {  $('#install-button').remove(); }, function (e) { console.log(e) });
}

var reauthWin;
function do_reauth () {
  clearTimeout(saveLoop);
  var ts = Date.now();
  reauthWin = window.open('/pre_reauth?ts=' + ts, '_blank', 'height=400,width=680,location=no,menubar=no,status=no,titlebar=no,toolbar=no,top=0,left=0');
}

function reauth_done () {
  if (PREFS.auto_save) {
    saveLoop = setTimeout(function() { auto_save(); }, 5000);
  }
  
  reauthWin.close();
  alert('Reauthorization successful, you can now retry your request');
}

var html_editor;
function open_html () {
  var ctab = Tabs.current_tab();
  
  if (Tabs.data[ctab].mode == 'html') {
    try {
      CKEDITOR.instances.ckeditor.destroy();
    }
    
    catch (e) {}
    
    $("#htmlModal").modal('show');
    $("#htmlSpan").html(Tabs.data[ctab].name);
    
    html_editor = CKEDITOR.replace('ckeditor', {customConfig : '/static/js/ckconfig.js', height: '330', fullPage: true});
    
    var data = Tabs.data[ctab].session.getValue();
    CKEDITOR.instances.ckeditor.setData(data);
  }
  
  else {
    alert('Sorry, you can only use this feature on HTML files.');
  }
}

function update_html () {
  var html = CKEDITOR.instances.ckeditor.getData();
  Editor.getSession().setValue(html);
  $("#htmlModal").modal('hide');
  CKEDITOR.instances.ckeditor.destroy();
}

function check_diff () {
  if ($('input[name="diff"]:checked').length > 2) {
    alert('You can only select two versions to diff.');
    return false;
  }
  
  return true;
}

var diff_text1 = '';
var diff_text2 = '';
var diff_head1 = '';
var diff_head2 = '';

function generate_diff (inline) {
  var base = difflib.stringAsLines(diff_text1);
  var newtxt = difflib.stringAsLines(diff_text2);
	var sm = new difflib.SequenceMatcher(base, newtxt);
	var opcodes = sm.get_opcodes();
	$("#revDiffBody").html('');
  
	var tree = diffview.buildView({
    baseTextLines:base,
    newTextLines:newtxt,
    opcodes:opcodes,
    baseTextName: diff_head1,
    newTextName: diff_head2,
    contextSize:null,
    viewType: inline
  });
  $("#revDiffBody").append(tree);
}
