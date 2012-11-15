var currentSearch;
var currentOpts;
var currentRange;
var currentReplace;

var Search = require('ace/search').Search;
var Range = require("ace/range").Range;

function do_search () {
  var sr = $("#s_sr").get(0).checked;
  var sterm = $("#s_search").val();
  currentReplace = $("#s_replace").val();
  var all = $("#s_tabs").get(0).checked;
  
  $("#search_form .init").addClass('hide');
  $("#s_newsearch").removeClass('hide');
  $("#search_form input").attr('disabled', 'disabled');
  
  if (all) {
    if (sr) {
      $("#s_replaceall").removeClass('hide');
    }
  }
  
  else {
    $("#s_prev").removeClass('hide');
    $("#s_next").removeClass('hide');
    
    if (sr) {
      $("#s_rnext").removeClass('hide');
      $("#s_replaceall").removeClass('hide');
    }
    
    else {
      $("#s_next").focus();
    }
  }
  
  currentOpts = {
    needle: sterm,
    backwards: false,
    wrap: true,
    caseSensitive: $("#s_opt_case").get(0).checked,
    wholeWord: $("#s_opt_word").get(0).checked,
    scope: Search.ALL,
    regExp: $("#s_opt_regex").get(0).checked
  };
  
  currentSearch = new Search().set(currentOpts);
  
  if (all) {
    var cnt = 0;
    var html = '';
    for (i in Tabs.files) {
      var file_id = Tabs.files[i];
      var ranges = currentSearch.findAll(Tabs.data[file_id].session);
      if (ranges.length > 0) {
        var h = '<div class="file_results" id="result_' + file_id + '"><h2>' + Tabs.data[file_id].name + ' (' + ranges.length + ')</h2>';
        h = h + '<div class="table">';
        h = h + generate_table(ranges, file_id);
        h = h + '</div></div>';
        html = html + h;
        
        cnt = cnt + ranges.length;
      }
    }
    
    $("#s_count").html('(' + cnt +')');
    $('#search_results').html(html);
  }
  
  else {
    var ranges = currentSearch.findAll(Editor.getSession());
    if (ranges.length > 0) {
      var fid = $("#tab_bar .current").get(0).id;
      var html = generate_table(ranges, fid);
      $('#search_results').html(html);
      search_next();
      $("#s_count").html('(' + ranges.length +')');
    }
    
    else {
      $('#search_results').html('<em>Nothing found, better luck next time</em>');
      currentSearch = null;
    }
  }
  
  return false;
}

function generate_table (ranges, fid) {
  var html = '<table class="table table-striped"><tbody>';
  for (i in ranges) {
    var row = ranges[i].start.row + 1;
    var col = ranges[i].start.column + 1;
    
    var goto = 'go_to_line(\'' + fid + '\', ' + ranges[i].start.row + ', ' + ranges[i].start.column + ', ' + ranges[i].end.column +')';
    html = html + '<tr><td><a href="javascript: void(0);" onclick="' + goto + '">Line ' + row + ', Column ' + col +'</td></tr>';
  }
  
  html = html + '</tbody></table>';
  return html;
}

function reset_search () {
  var sr = $("#s_sr").get(0).checked;
  
  $("#search_form input").removeAttr('disabled');
  if (!sr) {
    $("#s_replace").attr('disabled', 'disabled');
  }
  
  $("#search_form .init").removeClass('hide');
  $("#search_form .next").addClass('hide');
  
  $('#search_results').html('<em>Search Not Started</em>');
  
  $("#s_count").html('');
  $("#s_search").focus();
}

function set_sr () {
  var sr = $("#s_sr").get(0).checked;
  
  if (sr) {
    $("#s_replace").removeAttr('disabled');
  }
  
  else {
    $("#s_replace").attr('disabled', 'disabled');
  }
  
}

function go_to_line (fid, line, start, end) {
  var range = new Range(line, start, line, end);
  Tabs.switch_tab(fid);
  
  currentSearch.findAll(Tabs.data[fid].session);
  Tabs.data[fid].session.getSelection().setSelectionRange(range, false);
}

function search_next () {
  if (currentSearch) {
    if (currentOpts.backwards) {
      currentOpts.backwards = false;
      currentSearch = new Search().set(currentOpts);
    }
    
    var session = Editor.getSession();
    currentRange = currentSearch.find(session);
    
    if (currentRange) {
      session.getSelection().setSelectionRange(currentRange, false);
    }
  }
}

function search_prev () {
  if (currentSearch) {
    if (!currentOpts.backwards) {
      currentOpts.backwards = true;
      currentSearch = new Search().set(currentOpts);
    }
    
    var session = Editor.getSession();
    currentRange = currentSearch.find(session);
    
    if (currentRange) {
      session.getSelection().setSelectionRange(currentRange, false);
    }
  }
}

function search_replace_next () {
  if (currentRange) {
    var session = Editor.getSession();
    var input = session.getTextRange(currentRange);
    var replacement = currentSearch.replace(input, currentReplace);
    if (replacement !== null) {
      currentRange.end = session.replace(currentRange, replacement);
    }
  }
  
  search_next();
}

function search_replace_all () {
  var all = $("#s_tabs").get(0).checked;
  if (all) {
    for (i in Tabs.files) {
      var file_id = Tabs.files[i];
      replace_all(Tabs.data[file_id].session);
    }
  }
  
  else {
    replace_all(Editor.getSession());
  }
}

function replace_all (session) {
  var ranges = currentSearch.findAll(session);
  
  if (!ranges.length)
    return;
    
  var selection = Editor.getSelectionRange();
  Editor.clearSelection();
  Editor.selection.moveCursorTo(0, 0);

  Editor.$blockScrolling += 1;
  for (var i = ranges.length - 1; i >= 0; --i) {
    var input = session.getTextRange(ranges[i]);
    var replacement = currentSearch.replace(input, currentReplace);
    if (replacement !== null) {
      session.replace(ranges[i], replacement);
    }
  }
    
  Editor.$blockScrolling -= 1;
}
