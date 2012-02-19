$(document).ready(function() {
  
  $('.issue-item').draggable({opacity: 0.7, helper: 'clone'});
  $('#backlog, #current, #completed, #icebox').droppable({
    drop: function(e, ui) {
      tgt = $(ui.draggable);
      tgt.appendTo($(this));
      applyVisualLabel(tgt, $(this).attr('id'));
      
      if ($(this).attr('id') == 'completed') {
        closeIssue(tgt)
      } else {
        applyGithubLabel(tgt, $(this).attr('id'));
      }
    }
  });
  
});

var applyGithubLabel = function(tgt, id) {
  $.get('/issue/update/'+window.ICEDOUT.user+'/'+window.ICEDOUT.repo+'/'+tgt.data('issue')+'/'+id+'/'+window.ICEDOUT.key, function(r) {
    console.log(r)
  });
}

var closeIssue = function(tgt) {
  $.get('/issue/close/'+window.ICEDOUT.user+'/'+window.ICEDOUT.repo+'/'+tgt.data('issue')+'/'+window.ICEDOUT.key, function(r) {
    console.log(r)
  });
}

var applyVisualLabel = function(tgt, id) {
  tgt.find('.item-label').remove();
  label = tgt.append('<span class="item-label label"></div>');
  if (id == 'backlog') {
    tgt.find('.item-label').html('BACKLOG');
    tgt.find('.item-label').addClass('label-info');
  } else if (id == 'icebox') {
    tgt.find('.item-label').html('ICEBOX');
  } else if (id == 'current') {
    tgt.find('.item-label').html('IN PROGRESS');
    tgt.find('.item-label').addClass('label-success');
  } else {
    tgt.find('.item-label').html('CLOSED');
    tgt.find('.item-label').addClass('label-important');
  }
};