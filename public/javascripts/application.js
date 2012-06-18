$(document).ready(function() {
  
  $('.statecolumn').sortable({
    helper: 'clone',
    forcePlaceholderSize: true,
    connectWith: '.statecolumn',
    update: function(evt, ui) {
      tgt = $(ui.item);
      container = tgt.parent();
      els = container.find('.issue-item');
      els.each(function(i) {
        $(this).attr('data-position', i);
      });
      updateIssueOrder(els);
    },
    receive: function(evt, ui) {
      tgt = $(ui.item);
      applyVisualStatus(tgt, $(this).attr('id'));
      if ($(this).attr('id') == 'completed_ic') {
        applyGithubLabel(tgt, $(this).attr('id'), 'closed');
      } else {
        applyGithubLabel(tgt, $(this).attr('id'), 'open');
      }
    }
  }).disableSelection();
  
  $('#new-issue').click(function(evt) {
    var m = ich.newissue();
    $('body').append(m);
    $(m).modal('show');
  });
  
  console.log($('.list-filter-drop'))
  $('.list-filter-drop').dropdown();
  
  $(window).resize(resizeColumns);
  resizeColumns();
  
});

var updateIssueOrder = function(els) {
  var issueobj, d;
  issueobj = {};
  $(els).each(function(i) {
    var el = $(this),
        id = el.attr('data-githubid'),
        pos = el.attr('data-position');
    issueobj[id] = pos;
  });
  d = {
    github_id: window.ICEY.github_id,
    issues: JSON.stringify(issueobj)
  };
  console.log(d)
  $.ajax({
        type: 'POST'
      , url: '/issues/reorder'
      , data: d
      , success: function(r) {
        // TODO: something
      }
      , error: function(e) {
        console.log(e)
      }
  });
};

var applyGithubLabel = function(tgt, id, state) {
  var url = '/issue/'+tgt.data('issue')+'/update/'+id;
  if (typeof(state) != undefined) url = url+'/state/'+state;
  $.get(url, function(r) {
    // TODO: something
  });
}

var closeIssue = function(tgt) {
  $.get('/issue/close/'+window.ICEY.user+'/'+window.ICEY.repo+'/'+tgt.data('issue')+'/'+window.ICEY.key, function(r) {
    // TODO: something
  });
}

var applyVisualStatus = function(tgt, id) {

  var c = tgt.attr('class').split(' ')[1];
  tgt.removeClass(c);
  if (id == 'backlog_ic') {
    tgt.addClass('backlog');
  } else if (id == 'icebox_ic') {
    tgt.addClass('icebox');
  } else if (id == 'current_ic') {
    tgt.addClass('started');
  } else {
    tgt.addClass('closed');
  }

};

var resizeColumns = function() {
  var hgt = $(window).height();
  console.log(hgt);
  $(".statecolumn").height(hgt - 200);
};