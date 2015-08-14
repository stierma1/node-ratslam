
requirejs.config({
    baseUrl:"/public",
    paths:{
      "three": "vendor/three.js/three",
      "jquery": "vendor/jquery/dist/jquery"
    },
    callback: function(){
      require(["require", "three", "jquery", "get-pose-cells", "draw"], function(require){
        require("three");
        require("get-pose-cells");
        require("draw").init();
        setInterval(function(){
          require("draw").update();
        }, 1000);
      });
    }
});
