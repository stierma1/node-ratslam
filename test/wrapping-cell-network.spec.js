var sinon = require("sinon");
var chai = require("chai");
var expect = chai.expect;
chai.should();
var WrappingCellNetwork = require("../lib/wrapping-cell-network");
var identityFunc = function(x){return x;};

describe("#WrappingCellNetwork", function() {
    beforeEach(function() {});
    afterEach(function() {});
    describe("constructor", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should construct a wrapping cell network", function(){
          //should create a 3x3 grid with 9 cells total
          var network = new WrappingCellNetwork([3,3]);
          network.cells.should.have.property("length").equals(9);
          network.partitionedCells.should.have.property("length").equals(3);
          network.partitionedCells[0].should.have.property("length").equals(3);
        })
    });
    describe("_buildCells", function() {
        beforeEach(function() {});
        afterEach(function() {});
    });
    describe("_partitionCells", function() {
        beforeEach(function() {});
        afterEach(function() {});
    });
    describe("get", function() {
        var network;
        beforeEach(function() {
          network = new WrappingCellNetwork([3,3,3], identityFunc);
        });
        afterEach(function() {});
        it("should get the cell at the given index", function(){
          network.get(0,0,0).should.be.equal(0);
          network.get(0,0,1).should.be.equal(1);
          network.get(0,0,2).should.be.equal(2);
          network.get(0,1,0).should.be.equal(3);
          network.get(1,0,0).should.be.equal(9);
          network.get(2,2,2).should.be.equal(26);
        });
        it("should get the cell at the given index even if greater than idx", function(){
          network.get(0,0,3).should.be.equal(0);
          network.get(0,0,4).should.be.equal(1);
          network.get(0,0,5).should.be.equal(2);
          network.get(0,4,0).should.be.equal(3);
          network.get(4,0,0).should.be.equal(9);
          network.get(5,5,5).should.be.equal(26);
        });
        it("should get the cell at the given index even if negative", function(){
          network.get(0,0,-3).should.be.equal(0);
          network.get(0,0,-2).should.be.equal(1);
          network.get(0,0,-1).should.be.equal(2);
          network.get(0,-2,0).should.be.equal(3);
          network.get(-2,0,0).should.be.equal(9);
          network.get(-1,-1,-1).should.be.equal(26);
        });
    });

    describe("getUnwrappedLocation", function() {
        var network;
        beforeEach(function() {
          network = new WrappingCellNetwork([3,3,3], identityFunc);
        });
        afterEach(function() {});
        it("should get the cell at the given index", function(){
          var unwrappedLocation = network.getUnwrappedLocation(2,2,2);
          network.get.apply(network, unwrappedLocation).should.be.equal(26);
        });
        it("should get the cell at the given index even if greater than idx", function(){
          network.getUnwrappedLocation(5,5,5).map(function(val){
            expect(val).to.equal(2);
          });
        });
        it("should get the cell at the given index even if negative", function(){
          network.getUnwrappedLocation(-1,-1,-1).map(function(val){
            expect(val).to.equal(2);
          });
        });
    });

    describe("set", function() {
        var network;
        beforeEach(function() {
          network = new WrappingCellNetwork([3,3,3], identityFunc);
        });
        afterEach(function() {});
        it("should set the cell at the given index", function(){
          network.set("test",0,0,0)
          network.get(0,0,0).should.be.equal("test");
          network.set("test2", 2, 2, 2)
          network.get(2,2,2).should.be.equal("test2");
        });
        it("should set the cell at the given index even if greater than idx", function(){
          network.set("test",0,0,3)
          network.get(0,0,0).should.be.equal("test");
          network.set("test2", 5, 5, 5)
          network.get(2,2,2).should.be.equal("test2");
        });
        it("should get the cell at the given index even if negative", function(){
          network.set("test",0,0,-3)
          network.get(0,0,0).should.be.equal("test");
          network.set("test2", -1, -1, -1)
          network.get(2,2,2).should.be.equal("test2");
        });
    });

    describe("getCellPointer", function() {
        var network;
        beforeEach(function() {
          network = new WrappingCellNetwork([3,3,3], identityFunc);
        });
        afterEach(function() {});
        it("should get the cell at the given index", function(){
          var cell = network.getCellPointer(2,2,2);
          expect(cell.cell.value).to.equal(26);
        });

    });
});

describe("#CellPointer", function() {
    var network;
    beforeEach(function() {
      network = new WrappingCellNetwork([3,3,3], identityFunc);
    });
    afterEach(function() {});
    describe("constructor", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should construct a wrapping cell network", function(){
          var cellPointer = new WrappingCellNetwork.CellPointer(network, {value:0}, [0,0,0]);
          expect(cellPointer.cell.value).to.equal(0);
        });
    });

    describe("move", function() {
        beforeEach(function() {});
        afterEach(function() {});
        it("should move to an adjacent cell", function(){
          var cellPointer = new WrappingCellNetwork.CellPointer(network, {value:0}, [0,0,0]);
          expect(cellPointer.cell.value).to.equal(0);
          cellPointer.move(0,0,1);
          expect(cellPointer.cell.value).to.equal(1);
        });
        it("should move to neighboring cells and wrap around the network", function(){
          var cellPointer = new WrappingCellNetwork.CellPointer(network, {value:0}, [0,0,0]);
          expect(cellPointer.cell.value).to.equal(0);
          cellPointer.move(0,0,1);
          expect(cellPointer.cell.value).to.equal(1);
          cellPointer.move(0,0,1);
          expect(cellPointer.cell.value).to.equal(2);
          cellPointer.move(0,0,2);
          expect(cellPointer.cell.value).to.equal(1);
          cellPointer.move(-3,0,0);
          expect(cellPointer.cell.value).to.equal(1);
        });
    });
});
