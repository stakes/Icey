$(document).ready(function() {
  
  $('.issue-item').draggable({opacity: 0.7, helper: 'clone'});
  $('#backlog, #current, #completed, #icebox').droppable({
    drop: function(e, ui) {
      $(ui.draggable).appendTo($(this))
    }
  });
  
});