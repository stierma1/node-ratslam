
var assert  = require("assert");

function Cell(value){
  this.value = value;
}

function WrappingCellNetwork(cellDims, initializationFunc){
  this.dims = cellDims.length;
  this.cellDims = cellDims;
  this.cells = this._buildCells(cellDims, initializationFunc);
  this.partitionedCells = this._partitionCells(this.cells, cellDims);
}

//Creates and returns an array of initialized cells
WrappingCellNetwork.prototype._buildCells = function(cellDims, initializationFunc){
  var args = arguments;
  var cells = [];
  var totalCells = 1;
  for(var i = 0; i < cellDims.length; i++){
    totalCells *= cellDims[i];
  }

  for(var i = 0; i < totalCells; i++){
    cells.push(new Cell(initializationFunc ? initializationFunc(i) : null));
  }

  return cells;
}

//Splits the 1 dimensional array of cells into an n-dimension grid partitions
//of cells
WrappingCellNetwork.prototype._partitionCells = function(cells, cellDims){
  var reverseCellDims = cellDims.reverse();

  var partitions = cells;
  for(var i = 0; i < reverseCellDims.length - 1; i++){
    partitions = partitions.reduce(function(reduced, val, idx){
      if(idx%reverseCellDims[i] === 0){
        reduced.push([val]);
      } else {
        reduced[reduced.length - 1].push(val);
      }
      return reduced;
    }, []);
  }
  cellDims.reverse(); //Stupid mutating function

  var pointer = partitions;
  for(var i = 0; i < cellDims.length; i++){
    assert(pointer.length === cellDims[i], "Partitioning failed this should never happen");
    if(cellDims.length - i !== 1){
      pointer = pointer[0];
    }
  }

  return partitions;
}

WrappingCellNetwork.prototype.get = function(){
  var args = arguments;
  var pointer = this.partitionedCells;
  if(args.length > this.cellDims.length){
    throw new Error("Dimensionality of index lookup greater than cell network dimensionality");
  }

  var unwrappedLocation = this.getUnwrappedLocation.apply(this, args);

  for(var i = 0; i < unwrappedLocation.length; i++){
    var arg = unwrappedLocation[i];
    pointer = pointer[arg];
  }

  if(pointer instanceof Cell){
    return pointer.value;
  }

  return pointer;
}

WrappingCellNetwork.prototype.getUnwrappedLocation = function(){
  var args = arguments;
  if(args.length > this.cellDims.length){
    throw new Error("Dimensionality of index lookup greater than cell network dimensionality");
  }
  var argArray = [];
  for(var i = 0; i < args.length; i++){
    var arg = args[i];
    if(arg >= 0 && arg < this.cellDims[i]){

    } else if(arg >= this.cellDims[i]) {
      args[i] = arg - this.cellDims[i];
      return this.getUnwrappedLocation.apply(this, args);
    } else {
      args[i] = arg + this.cellDims[i]
      return this.getUnwrappedLocation.apply(this, args);
    }
    argArray.push(arg);
  }

  return argArray;
}

//Watch for off by 1 errors
WrappingCellNetwork.prototype.set = function(data){
  var args = arguments;
  if(args.length - 1 > this.cellDims.length){
    throw new Error("Dimensionality of index lookup greater than cell network dimensionality");
  }
  var pointer = this.partitionedCells;

  var location = [];
  for(var i = 1; i < args.length; i++){
    location.push(args[i]);
  }
  var unwrappedLocation = this.getUnwrappedLocation.apply(this, location);

  for(var i = 0; i < unwrappedLocation.length; i++){
    var arg = unwrappedLocation[i];
    if(i === unwrappedLocation.length - 1){
      if(pointer[arg] instanceof Cell){
        pointer[arg].value = data;
      } else {
        pointer[arg] = data;
      }
      return;
    } else {
      pointer = pointer[arg];
    }
  }

  throw new Error("Unexpected set Failure");
}

WrappingCellNetwork.prototype.getCellPointer = function(){
  var args = arguments;
  var pointer = this.partitionedCells;
  if(args.length > this.cellDims.length){
    throw new Error("Dimensionality of index lookup greater than cell network dimensionality");
  }

  var unwrappedLocation = this.getUnwrappedLocation.apply(this, args);

  for(var i = 0; i < unwrappedLocation.length; i++){
    var arg = unwrappedLocation[i];
    pointer = pointer[arg];
  }

  return new CellPointer(this, pointer, unwrappedLocation);
}

WrappingCellNetwork.prototype.setCellPointer = function(cell){
  var args = arguments;
  var pointer = this.partitionedCells;
  if(args.length - 1 > this.cellDims.length){
    throw new Error("Dimensionality of index lookup greater than cell network dimensionality");
  }

  var location = [];
  for(var i = 1; i < args.length; i++){
    location.push(args[i]);
  }
  var unwrappedLocation = this.getUnwrappedLocation.apply(this, location);

  for(var i = 0; i < unwrappedLocation.length; i++){
    var arg = unwrappedLocation[i];
    pointer = pointer[arg];
  }

  return cell.set(pointer, unwrappedLocation);
}

function CellPointer(network, cell, location){
  this.network = network;
  this.cell = cell;
  this.location = location;
}

CellPointer.prototype.set = function(cell, location){
  this.cell = cell;
  this.location = location;
}

CellPointer.prototype.move = function(){
  var args = arguments;
  var newLocation = this.location.map(function(val, idx){
    return val + args[idx];
  });

  this.network.setCellPointer.apply(this.network,[this].concat(newLocation));
}

module.exports = WrappingCellNetwork;

module.exports.CellPointer = CellPointer;
