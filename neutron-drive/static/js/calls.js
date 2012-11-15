

function do_diff () {
  if ($('input[name="diff"]:checked').length == 2) {
    $('#revModal').modal('hide');
    $('#revDiffModal').modal('show');
    $("#revDiffBody").html('<strong>Retrieving revision please wait ...</strong>');
    
    var ctab = Tabs.current_tab();
    var rev1 = $('input[name="diff"]:checked').eq(0).data();
    var rev2 = $('input[name="diff"]:checked').eq(1).data();
    
    var title = Tabs.data[ctab].name + ' Diff: '; 
    title = title + '<a href="javascript: void(0);" onclick="revert_revision(\'' + rev1.id + '\', \'' + rev1.url + '\')">( revert )</a>' + rev1.date + ' vs ';
    title = title + '<a href="javascript: void(0);" onclick="revert_revision(\'' + rev2.id + '\', \'' + rev2.url + '\')">( revert )</a>'+ rev2.date;
    
    $("#revDiffTitle").html(title);
    diff_head1 = rev1.date;
    diff_head2 = rev2.date;
    
    $.ajax({
      type: 'POST',
      url: ndrive.negotiator,
      data: {file_id: rev1.id, task: 'get_urls', url1: rev1.url, url2: rev2.url},
      success: function (data) {
        diff_text1 = data.text1;
        diff_text2 = data.text2;
        generate_diff(0);
      },
      error: function () {
        alert('Error retrieving revision content.');
        $('#revDiffModal').modal('hide');
        $('#revModal').modal('show');
      }
    });
  }
  
  else {
    alert('Select two versions to diff.');
  }
}
