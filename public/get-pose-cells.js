
define(function(require){

  var $ = require("jquery");


  return {
    getPoseData :function(){
      return $.ajax("/pose-data")
    },
    movePoseData : function(){
      return $.ajax("/pose-update")
    }
  }

});
