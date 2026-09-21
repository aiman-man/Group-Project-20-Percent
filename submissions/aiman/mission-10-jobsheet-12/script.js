$(document).ready(function(){
  $("button").click(function(){
    $.ajax({
      url: "contact.txt",
      success: function(result){
        $("#div1").html(result);
      },
      error: function(){
        $("#div1").html("<p>Unable to load the requested content.</p>");
      }
    });
  });
});