
var express = require("express");

var app = express();

var PoseCellNetwork = require("./lib/pose-cell-network");

var config = {
  physical_dimensions_xy: 28,
  rotation_dimensions_theta: 36,
  excitement_width: 8,
  excitement_variance: 1,
  inhibit_width: 6,
  inhibit_variance: 2,
  global_inhibit: .00002
};

var pcn = new PoseCellNetwork(config);
pcn.excite();
pcn.inhibit();
pcn.globallyInhibit();
pcn.normalise();

app.use("/public", express.static("public"));
app.use("/public/vendor", express.static("bower_components"))

app.get("/", function(req, res){
  res.redirect("/public/index.html");
});

app.get("/pose-data", function(req, res){
  res.status(200).send(pcn.toJson());
});

app.get("/pose-update", function(req, res){
  //console.log("ping");
  var t = new Date();
  pcn.pathIntegration(2,Math.PI/3);
  if(Math.random() < .1){
    pcn.inject(18,15 + Math.random() > .5 ? 10 : 0,15, .15);
  }
  pcn.excite();
  pcn.inhibit();
  pcn.globallyInhibit();
  pcn.normalise();
  pcn.findBest();

  console.log(pcn.theta(), pcn.y(), pcn.x())
  console.log((new Date() - t)/1000);
  res.status(200).end();
});

app.listen(8088);
