var Tabs = {
  files: [],
  data: {}
};

Tabs.add_html = function (file_id, name) {
  var l = (Tabs.files.length - 1) * 130;
  $("#tab_bar span.current").removeClass('current');
  var html = '<span class="current" id="' + file_id + '" style="left: ' + l + 'px;">';
  html = html + '<a draggable="true" href="javascript: void(0)" title="' + name + '" oncontextmenu="return right_tab_menu(event, \'' + file_id + '\')">' + name + '</a>';
  html = html + '<button type="button" class="close">×</button>';
  
  $("#tab_bar").append(html);
  
  $("#tab_bar span#" + file_id + ' a').click(function (event) {
    if (event.button == 1) {
      Tabs.remove_tab(file_id);
    }
    
    else {
      Tabs.switch_tab(file_id, true);
    }
  });
  $("#tab_bar span#" + file_id + ' button').click(function () { Tabs.remove_tab(file_id); });
  
  $("#tab_bar").animate({scrollLeft: l}, 500);
  
  var html2 = '<li><a id="tabsel_' + file_id + '" href="javascript: void(0);" onclick="Tabs.switch_tab(\'' + file_id + '\')">' + name + '</a></li>';
  
  $("#tab_drop").append(html2);
}

Tabs.add_file = function (file_id, name, mime, session, mode) {
  $("#ace_wrapper").removeClass('no_tabs');
  
  Tabs.files.push(file_id);
  Tabs.data[file_id] = {
    name: name,
    mime: mime,
    session: session,
    md5hash: md5(session.getValue()),
    undos: 0,
    saved_once: false,
    mode: mode
  };
  
  Tabs.add_html(file_id, name);
  
  var resize = $("#tab_bar span#" + file_id + ' a').get(0);
  resize.addEventListener('dragend', function(event) {
    var done = false;
    var new_i = $('#tab_bar > span').length - 1;
    var last_i = $('#tab_bar > span').length - 1;
    
    var file_id = $(event.target).parent().get(0).id;
    var bid =  file_id;
    try {
      var sib = $('#' + file_id).next().get(0).id;
    }
    
    catch (e) {
      var sib = 'narf';
    }
    
    $('#tab_bar > span').each(function(index, ele) {
      var point = $(ele).offset();
      
      if (done) {}
      else if (event.x < point.left) {
        bid = $(ele).get(0).id;
        new_i = index;
        done = true;
      }
    });
    
    var skip = false;
    if (last_i == f && last_i == new_i) {
      skip = true;
    }
    
    if (sib != bid && !skip) {
      var f = Tabs.files.indexOf(file_id);
      if (new_i != f) {
        Tabs.files.splice(f, 1);
        Tabs.files.splice(new_i, 0, file_id);
      }
      
      //if (file_id != bid) {
      //  $('#' + file_id).insertBefore('#' + bid);
      //}
      
      //else if (!done) {
      //  $('#tab_bar > span:last-child').insertAfter('#' + bid);
      //}
      
      Tabs.positions();
      update_session();
    }
  }, false);
};

Tabs.positions = function () {
  for (i in Tabs.files) {
    var l = i * 130;
    $("#" + Tabs.files[i]).css('left', l + 'px');
  }
}

Tabs.switch_tab = function (file_id, noscroll) {
  $("#tab_bar span.current").removeClass('current');
  $("#tab_bar span#" + file_id).addClass('current');
  Editor.setSession(Tabs.data[file_id].session);
  
  if (noscroll) {}
  else {
    var l = Tabs.files.indexOf(file_id) * 130;
    $("#tab_bar").animate({scrollLeft: l}, 500);
  }
};

Tabs.current_tab = function () {
  return $("#tab_bar span.current").get(0).id;
}

Tabs.remove_tab = function (file_id, skip_session) {
  var f = Tabs.files.indexOf(file_id);
  var sel = "#tab_bar span#" + file_id;
  var tab_switch = false;
  
  if (Tabs.files.length > 1) {
    if ($(sel).hasClass('current')) {
      var c = f + 1;
      if (c >= Tabs.files.length) {
        c = f - 1;
      }
      
      tab_switch = Tabs.files[c];
    }
  }
  
  else {
    $("#ace_wrapper").addClass('no_tabs');
  }
  
  delete Tabs.data[file_id].session;
  delete Tabs.data[file_id];
  
  Tabs.files.splice(f, 1);
  
  $(sel).remove();
  $('#tabsel_' + file_id).remove();
  for (i in Tabs.files) {
    var l = i * 130;
    $("#" + Tabs.files[i]).css('left', l + 'px');
  }
  
  if (tab_switch) {
    Tabs.switch_tab(tab_switch);
  }
  
  if (skip_session) {}
  else {
    update_session();
  }
};
