var sinon = require("sinon");
var chai = require("chai");
var expect = chai.expect;
chai.should();
var PoseCellNetwork = require("../lib/pose-cell-network");

describe("#PoseCellNetwork", function() {
    var config = {
      physical_dimensions_xy: 21,
      rotation_dimensions_theta: 36,
      excitement_width: 7,
      excitement_variance: 1,
      inhibit_width: 5,
      inhibit_variance: 2,
      global_inhibit: .00002
    };
    var midXy = 21/2 |0;
    var midTheta = 36/2 |0;

    beforeEach(function() {});
    afterEach(function() {});
    describe("constructor", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should construct a pose cell network", function(){
          //should create a 36x21x21 network with 15876 cells total
          var pcn = new PoseCellNetwork(config);

          pcn.numberOfCells.should.equal(15876);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta,midXy,midXy).should.equal(1);

          pcn.cells.get(1,1,1).should.equal(0);
        });
    });

    describe("inject", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should inject energy into a pose cell network at given coordinates", function(){
          //should create a 36x21x21 network with 15876 cells total
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta,midXy, midXy).should.equal(1);
          pcn.inject(midXy, midXy, midTheta, 1);
          pcn.cells.get(midTheta, midXy, midXy).should.equal(2);
        });
    });

    describe("excite", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should spread energy into neighboring posecells", function(){
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);

          pcn.excite();

          //center of pcExciteWidth is the peak of the normal distribution
          var floor = Math.floor(pcn.pcExciteWidth.length/2)

          pcn.cells.get(midTheta, midXy, midXy).should.equal(pcn.pcExciteWidth[floor]);
        });

        it("should not change the total energy in the system", function(){

          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);
          //Change the total energy
          pcn.inject(0,0,0,1);

          var total = pcn.cells.cells.reduce(function(reduced, cell){
            return reduced + cell.value;
          }, 0);

          pcn.excite();

          var newTotal = pcn.cells.cells.reduce(function(reduced, cell){
            return reduced + cell.value;
          }, 0);

          expect(approx(total, 2)).equals(true);
          expect(approx(newTotal, 2)).equals(true);

        });

        it("NOTE: if the excitement mask width is not an even number then the population vector will drift", function(){

        });
    });

    describe("inhibit", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should remove energy from neighboring posecells", function(){
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);

          pcn.inhibit();

          //center of pcInhibitWidth is the peak of the normal distribution
          var floor = Math.floor(pcn.pcInhibitWidth.length/2)

          pcn.cells.get(midTheta, midXy, midXy).should.equal(1 - pcn.pcInhibitWidth[floor]);
        });

        it("should make total energy of the system equal 0", function(){

          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);
          //Change the total energy
          pcn.inject(0,0,0,1);

          var total = pcn.cells.cells.reduce(function(reduced, cell){
            return reduced + cell.value;
          }, 0);

          pcn.inhibit();

          var newTotal = pcn.cells.cells.reduce(function(reduced, cell){
            return reduced + cell.value;
          }, 0);

          expect(approx(total, 2)).equals(true);
          expect(approx(newTotal, 0)).equals(true);

        });
    });

    describe("globallyInhibit", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should deduct the globalInhibit amount from each cell and then set cells that are negative to 0", function(){
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);
          pcn.inject(0,0,0, -1);
          pcn.globallyInhibit();

          pcn.cells.get(midTheta, midXy, midXy).should.equal(1 - pcn.globalInhibit);
          pcn.cells.get(0, 0, 0).should.equal(0);
        });
    });

    describe("normalise", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should make total energy equal to 1", function(){
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);
          pcn.inject(0,0,0, 1);

          pcn.excite();
          pcn.globallyInhibit();
          pcn.normalise();

          var newTotal = pcn.cells.cells.reduce(function(reduced, cell){
            return reduced + cell.value;
          }, 0);
          expect(approx(newTotal, 1)).equal(true);
        });
    });

    describe("pathIntegration", function(){
      beforeEach(function() {});
      afterEach(function() {});

      var params = [
        {
          param:{
            inject:[]
          },
          expected: {
            total: 1
          }
        },
        {
          param:{
            inject:[
              [0,0,0,1]
            ]
          },
          expected: {
            total: 2
          }
        },
        {
          param:{
            inject:[
              [0,0,0,1],
              [2,3,5,1]
            ]
          },
          expected: {
            total: 3
          }
        }
      ];

      params.forEach(function(val, idx){
        it("should not change total energy of the system [" + idx + "]", function(){
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);

          val.param.inject.forEach(function(injectArgs){
            pcn.inject.apply(pcn, injectArgs);
          });

          pcn.pathIntegration(2, 1);

          var newTotal = pcn.cells.cells.reduce(function(reduced, cell){
            return reduced + cell.value;
          }, 0);
          expect(approx(newTotal, val.expected.total)).equal(true);
        });
      });
    });

    describe("findBest", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should set the best estimated pose location", function(){
          var pcn = new PoseCellNetwork(config);
          //center cell should be set to energy 1
          pcn.cells.get(midTheta, midXy, midXy).should.equal(1);

          pcn.findBest();
          expect(approx(pcn.x(),midXy)).equal(true);
          expect(approx(pcn.y(),midXy)).equal(true);
          expect(approx(pcn.theta(),midTheta)).equal(true);
        });
    });

});

function approx(val, expected){
  var fudgeFactor = .000000001;
  return expected - val < fudgeFactor && expected - val > 0 -fudgeFactor;
}
