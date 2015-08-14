var assert = require("assert");
var WrappingCellNetwork = require("./wrapping-cell-network");

function PoseCellNetwork(config){
  this.config = config;
  this.physicalDimensionsXY = config.physical_dimensions_xy;
  this.rotationDimensionsTheta = config.rotation_dimensions_theta;
  this.excitementWidth = config.excitement_width;
  this.inhibitWidth = config.inhibit_width;
  this.excitementVariance = config.excitement_variance;
  this.inhibitVariance = config.inhibit_variance;
  this.globalInhibit = config.global_inhibit;
  this.bestX = Math.floor(this.physicalDimensionsXY/2);
  this.bestY = Math.floor(this.physicalDimensionsXY/2);
  this.bestTheta = Math.floor(this.rotationDimensionsTheta/2);
  this.exciteFloor = Math.floor(this.excitementWidth/2);
  this.exciteCeil = Math.ceil(this.excitementWidth/2);
  this.inhibitFloor = Math.floor(this.inhibitWidth/2);
  this.inhibitCeil = Math.ceil(this.inhibitWidth/2);
  buildCells.call(this);
}

function buildCells(){
  this.numberOfCells = this.physicalDimensionsXY * this.physicalDimensionsXY * this.rotationDimensionsTheta;
  this.thetaCellSize = (2.0 * Math.PI) / this.rotationDimensionsTheta;
  this.cellsToAverage = 3;
  this.cells = new WrappingCellNetwork([this.rotationDimensionsTheta, this.physicalDimensionsXY, this.physicalDimensionsXY], function(){
    return 0;
  })
  this.cells.set(1, this.bestTheta, this.bestY, this.bestX);

  this.newCells = new WrappingCellNetwork([this.rotationDimensionsTheta, this.physicalDimensionsXY, this.physicalDimensionsXY], function(){
    return 0;
  })

  this.xySumSinLookup = [];
  this.xySumCosLookup = [];
  this.thetaSumSinLookup = [];
  this.thetaSumCosLookup = [];

  for (var i = 0; i < this.physicalDimensionsXY; i++)
	{
		this.xySumSinLookup[i] = Math.sin((i+1) * 2.0 * Math.PI /  this.physicalDimensionsXY);
		this.xySumCosLookup[i] = Math.cos((i+1) * 2.0 * Math.PI / this.physicalDimensionsXY);
	}

	for (var i = 0; i < this.rotationDimensionsTheta; i++)
	{
		this.thetaSumSinLookup[i] = Math.sin((i+1) * 2.0 * Math.PI / this.rotationDimensionsTheta);
		this.thetaSumCosLookup[i] = Math.cos((i+1) * 2.0 * Math.PI / this.rotationDimensionsTheta);
	}

  var total = 0;
  var next = 0;
	var dim_centre = this.excitementWidth / 2;
  this.pcExciteWidth = [];

	for (var k = 0; k < this.excitementWidth; k++){
		for (var j = 0; j < this.excitementWidth; j++){
			for (var i = 0; i < this.excitementWidth; i++){
				this.pcExciteWidth[next] = this.norm2d(this.excitementVariance, i, j, k, dim_centre);
				total += this.pcExciteWidth[next];
				next++;
			}
		}
	}

  var assertSum = 0;
  for (next = 0; next < this.excitementWidth*this.excitementWidth*this.excitementWidth; next++){
		this.pcExciteWidth[next] /= total;
    assertSum += this.pcExciteWidth[next];
	}

  //ideally the sum would be 1 but double floating point is not perfect
  assert(assertSum < 1.000000000001 && assertSum > .99999999999999, "pcExciteWidth failed to normalize.  parameters maybe causing round off error")

  this.pcInhibitWidth = [];

  total = 0;
	dim_centre = this.inhibitWidth / 2;
	next = 0;
	for (k = 0; k < this.inhibitWidth; k++)
	{
		for (j = 0; j < this.inhibitWidth; j++)
		{
			for (i = 0; i < this.inhibitWidth; i++)
			{
				this.pcInhibitWidth[next] = this.norm2d(this.inhibitVariance, i, j, k, dim_centre);
				total += this.pcInhibitWidth[next];
				next++;
			}
		}
	}

	for (next = 0; next < this.inhibitWidth*this.inhibitWidth*this.inhibitWidth; next++)
	{
		this.pcInhibitWidth[next] /= total;
		//printf("PC_W_INHIB[%i] = %f\n", next, PC_W_INHIB[next]);
	}

}

//inject energy into cell network at a specific point
//returns bool
PoseCellNetwork.prototype.inject = function(x, y, z, energy){
	// todo: check bounds
  var newEnergy = this.cells.get(z,y,x) + energy;
  this.cells.set(newEnergy, z, y, x);
	//this.posecells[z][y][x] += energy;

	return true;
}

//locally excite cells ie spread the energy out
PoseCellNetwork.prototype.excite = function(){
  var i;
  for(i = 0; i <  this.numberOfCells; i++){
    this.newCells.cells[i].value = 0;
  }

  // loop through all dimensions
  for (var i = 0; i < this.physicalDimensionsXY; i++){
    for (var j = 0; j < this.physicalDimensionsXY; j++){
      for (var k = 0; k < this.rotationDimensionsTheta; k++){
        if (this.cells.partitionedCells[k][j][i].value !== 0){
          // if there is energy in the current posecell,
          // spread the energy
          this.poseCellExciteHelper(i, j, k);
        }
      }
    }
  }

  for(i = 0; i <  this.numberOfCells; i++){
    this.cells.cells[i].value = this.newCells.cells[i].value;
  }
};

//locally inhibit cells ie compress the energy
//returns bool
PoseCellNetwork.prototype.inhibit = function(){
  	var i, j, k;
  	// set pca_new to 0
    for(i = 0; i < this.numberOfCells; i++){
      this.newCells.cells[i].value = 0;
    }

  	// loop through all dimensions
  	for (i = 0; i < this.physicalDimensionsXY; i++){
  		for (j = 0; j < this.physicalDimensionsXY; j++){
  			for (k = 0; k < this.rotationDimensionsTheta; k++){
  				if (this.cells.partitionedCells[k][j][i].value !== 0){
  					// if there is energy in the current posecell,
  					// inhibit the energy
  					this.poseCellInhibitHelper(i, j, k);
  				}
  			}
  		}
  	}

    for(i = 0; i <  this.numberOfCells; i++){
      this.cells.cells[i].value -= this.newCells.cells[i].value;
    }

};

//global inhibit cells network
//returns bool
PoseCellNetwork.prototype.globallyInhibit = function(){
  for(var i = 0; i < this.physicalDimensionsXY; i++){
    for(var j = 0; j < this.physicalDimensionsXY; j++){
      for(var k = 0; k < this.rotationDimensionsTheta; k++){
        var curCellEnergy = this.cells.partitionedCells[k][j][i].value;
        if(curCellEnergy >= this.globalInhibit){
          this.cells.partitionedCells[k][j][i].value = curCellEnergy - this.globalInhibit;
        } else if(curCellEnergy !== 0) {
          this.cells.partitionedCells[k][j][i].value = 0;
        }
        //Else curCellEnergy is 0 and we dont have to do anything
      }
    }
  }

};

//Shift the energy in the system by a translation and rotation
//velocity
//returns bool
PoseCellNetwork.prototype.pathIntegration = function(vtrans, vrot){

  for(var i = 0; i <  this.numberOfCells; i++){
    this.newCells.cells[i].value = 0;
  }

  var angle_to_add = 0;
	if (vtrans < 0)
	{
		vtrans = -vtrans;
		angle_to_add = Math.PI;
	}

  for(var k = 0; k < this.rotationDimensionsTheta; k++){
    var newTheta = k * this.thetaCellSize + angle_to_add + vrot;
    for(var j = 0; j < this.physicalDimensionsXY; j++){
      for(var i = 0; i < this.physicalDimensionsXY; i++){
        var curEnergy = this.cells.partitionedCells[k][j][i].value;
        if(curEnergy !== 0){
          var thetaShift = (vrot + angle_to_add)/this.thetaCellSize;
          var xShift = vtrans * Math.cos(newTheta);
          var yShift = vtrans * Math.sin(newTheta);
          var thetaCore = k + thetaShift;
          var xCore = i + xShift;
          var yCore = j + yShift;

          var thetaRound = round(thetaCore)%this.rotationDimensionsTheta;
          var thetaIdx = thetaCore > thetaRound ? Math.ceil(thetaCore) : Math.floor(thetaCore);
          var thetaIdxWeight = get1dWeight(thetaIdx, thetaCore);
          var thetaRoundWeight = 1 - thetaIdxWeight;

          var xRound = round(xCore);
          var xIdx = xCore > xRound ? Math.ceil(xCore) : Math.floor(xCore);
          var xIdxWeight = get1dWeight(xIdx, xCore);
          var xRoundWeight = 1 - xIdxWeight;

          var yRound = round(yCore);
          var yIdx = yCore > yRound ? Math.ceil(yCore) : Math.floor(yCore);
          var yIdxWeight = get1dWeight(yIdx, yCore);
          var yRoundWeight = 1 - yIdxWeight;

          //var quad1 = [yRound, xRound];
          var quad1Weight = xRoundWeight * yRoundWeight;
          //var quad2 = [yRound, xIdx];
          var quad2Weight = xIdxWeight * yRoundWeight;
          //var quad3 = [yIdx, xIdx];
          var quad3Weight = xIdxWeight * yIdxWeight;
          //var quad4 = [yIdx, xRound];
          var quad4Weight = xRoundWeight * yIdxWeight;

          assert(quad1Weight + quad2Weight + quad3Weight + quad4Weight <= 1.00001 && quad1Weight + quad2Weight + quad3Weight + quad4Weight >= .99999, "quadrant weight failed to sum to 1");

          var unwrappedRound = this.newCells.getUnwrappedLocation(thetaRound, yRound, xRound);
          thetaRound = unwrappedRound[0];
          yRound = unwrappedRound[1];
          xRound = unwrappedRound[2];
          var unwrappedIdx = this.newCells.getUnwrappedLocation(thetaIdx, yIdx, xIdx);
          thetaIdx = unwrappedIdx[0];
          yIdx = unwrappedIdx[1];
          xIdx = unwrappedIdx[2];

          this.newCells.partitionedCells[thetaRound][yRound][xRound].value += curEnergy * quad1Weight * thetaRoundWeight;
          this.newCells.partitionedCells[thetaRound][yRound][xIdx].value += curEnergy * quad2Weight * thetaRoundWeight;
          this.newCells.partitionedCells[thetaRound][yIdx][xIdx].value += curEnergy * quad3Weight * thetaRoundWeight;
          this.newCells.partitionedCells[thetaRound][yIdx][xRound].value += curEnergy * quad4Weight * thetaRoundWeight;

          this.newCells.partitionedCells[thetaIdx][yRound][xRound].value += curEnergy * quad1Weight * thetaIdxWeight;
          this.newCells.partitionedCells[thetaIdx][yRound][xIdx].value += curEnergy * quad2Weight * thetaIdxWeight;
          this.newCells.partitionedCells[thetaIdx][yIdx][xIdx].value += curEnergy * quad3Weight * thetaIdxWeight;
          this.newCells.partitionedCells[thetaIdx][yIdx][xRound].value += curEnergy * quad4Weight * thetaIdxWeight;
        }
        //else the cell has no energy and will not add anything to integration
      }
    }
  }

  for(var i = 0; i < this.numberOfCells; i++){
    this.cells.cells[i].value = this.newCells.cells[i].value;
  }

	return true;
};

//Finds an approximation of the center of energy
PoseCellNetwork.prototype.findBest = function(){
  var i, j, k;
  var x, y, th;

  var x_sums, y_sums, z_sums;
  var sum_x1, sum_x2, sum_y1, sum_y2;

  	// % find the max activated cell)
  var max = 0;

  	for (k = 0; k < this.rotationDimensionsTheta; k++){
  		for (j = 0; j < this.physicalDimensionsXY; j++){
  			for (i = 0; i < this.physicalDimensionsXY; i++){
          var energy = this.cells.partitionedCells[k][j][i].value;
  				if (energy > max){
  					max = energy;
  					x = i;
  					y = j;
  					th = k;
  				}
  			}
  		}
  	}


  	//  % take the max activated cell +- AVG_CELL in 3d space
  	//  z_pc.Posecells=zeros(PARAMS.PC_DIM_XY, PARAMS.PC_DIM_XY, PARAMS.PC_DIM_TH);
  	//  z_pc.Posecells(pc.PC_AVG_XY_WRAP(x:x+pc.PC_CELLS_TO_AVG*2), pc.PC_AVG_XY_WRAP(y:y+pc.PC_CELLS_TO_AVG*2), pc.PC_AVG_TH_WRAP(z:z+pc.PC_CELLS_TO_AVG*2)) = ...
  	//      pc.Posecells(pc.PC_AVG_XY_WRAP(x:x+pc.PC_CELLS_TO_AVG*2), pc.PC_AVG_XY_WRAP(y:y+pc.PC_CELLS_TO_AVG*2), pc.PC_AVG_TH_WRAP(z:z+pc.PC_CELLS_TO_AVG*2));
  	//  % get the sums for each axis
  	//  x_sums = sum(sum(z_pc.Posecells, 2), 3)';
  	//  y_sums = sum(sum(z_pc.Posecells, 1), 3);
  	//  th_sums = sum(sum(z_pc.Posecells, 1), 2);
  	//  th_sums = th_sums(:)';

    for(var i = 0; i < this.numberOfCells; i++){
      this.newCells.cells[i].value = 0;
    }

    var templateArr = [];
    for(var i =0; i < this.physicalDimensionsXY; i ++){
      templateArr.push(0);
    }

  	x_sums = templateArr.concat([]);
  	y_sums = templateArr.concat([]);

    templateArr = [];
    for(var i =0; i < this.rotationDimensionsTheta; i ++){
      templateArr.push(0);
    }

  	z_sums = templateArr.concat([]);

    var floor = Math.floor((this.cellsToAverage*2 + 1)/2)
    var ceil = Math.ceil((this.cellsToAverage*2 + 1)/2)
  	for (k = th - floor; k < th + ceil; k++)
  	{
  		for (j = y - floor; j < y + ceil; j++)
  		{
  			for (i = x - floor; i < x + ceil; i++)
  			{
  				// pca_new[PC_AVG_TH_WRAP[k]][PC_AVG_XY_WRAP[j]][PC_AVG_XY_WRAP[i]] =
  				//  posecells[PC_AVG_TH_WRAP[k]][PC_AVG_XY_WRAP[j]][PC_AVG_XY_WRAP[i]];
          var unwrappedLocation = this.cells.getUnwrappedLocation(k,j,i);
          var val = this.cells.partitionedCells[unwrappedLocation[0]][unwrappedLocation[1]][unwrappedLocation[2]].value;
  				z_sums[unwrappedLocation[0]] += val;
  				y_sums[unwrappedLocation[1]] += val;
  				x_sums[unwrappedLocation[2]] += val;
  			}
  		}
  	}

  	//  % now find the (x, y, th) using population vector decoding to handle the wrap around
  	//  pc.x = mod(atan2(sum(pc.PC_XY_SUM_SIN_LOOKUP.*x_sums), sum(pc.PC_XY_SUM_COS_LOOKUP.*x_sums))*PARAMS.PC_DIM_XY/(2*pi), PARAMS.PC_DIM_XY);
  	//  pc.y = mod(atan2(sum(pc.PC_XY_SUM_SIN_LOOKUP.*y_sums), sum(pc.PC_XY_SUM_COS_LOOKUP.*y_sums))*PARAMS.PC_DIM_XY/(2*pi), PARAMS.PC_DIM_XY);
  	//  pc.th = mod(atan2(sum(pc.PC_TH_SUM_SIN_LOOKUP.*th_sums), sum(pc.PC_TH_SUM_COS_LOOKUP.*th_sums))*PARAMS.PC_DIM_TH/(2*pi), PARAMS.PC_DIM_TH);
  	sum_x1 = 0;
  	sum_x2 = 0;
  	sum_y1 = 0;
  	sum_y2 = 0;
  	for (i = 0; i < this.physicalDimensionsXY; i++)
  	{
  		sum_x1 += this.xySumSinLookup[i] * x_sums[i];
  		sum_x2 += this.xySumCosLookup[i] * x_sums[i];
  		sum_y1 += this.xySumSinLookup[i] * y_sums[i];
  		sum_y2 += this.xySumCosLookup[i] * y_sums[i];
  	}

  	x = Math.atan2(sum_x1, sum_x2)*(this.physicalDimensionsXY)/(2.0*Math.PI) - 1.0;
  	while (x < 0)
  	{
  		x += this.physicalDimensionsXY;
  	}
  	while (x > this.physicalDimensionsXY)
  	{
  		x -= this.physicalDimensionsXY;
  	}

  	y = Math.atan2(sum_y1, sum_y2)*(this.physicalDimensionsXY)/(2.0*Math.PI) - 1.0;
  	while (y < 0)
  	{
  		y += this.physicalDimensionsXY;
  	}

  	while (y > this.physicalDimensionsXY)
  	{
  		y -= this.physicalDimensionsXY;
  	}

  	sum_x1 = 0;
  	sum_x2 = 0;
  	for (i = 0; i < this.rotationDimensionsTheta; i++)
  	{
  		sum_x1 += this.thetaSumSinLookup[i] * z_sums[i];
  		sum_x2 += this.thetaSumCosLookup[i] * z_sums[i];
  	}
  	th = Math.atan2(sum_x1, sum_x2)*(this.rotationDimensionsTheta)/(2.0*Math.PI) - 1.0;
  	while (th < 0)
  	{
  		th += this.rotationDimensionsTheta;
  	}
  	while (th > this.rotationDimensionsTheta)
  	{
  		th -= this.rotationDimensionsTheta;
  	}

  	if (x < 0 || y < 0 || th < 0 || x > this.physicalDimensionsXY || y > this.physicalDimensionsXY || th > this.rotationDimensionsTheta)
  	{
  		//cout << "ERROR: " << x << ", " << y << ", " << th << " out of range" << endl;
      console.log("Error out of range:", th, y, x);
  	}

    this.bestX = x;
  	this.bestY = y;
  	this.bestTheta = th;

  	return max;
};

PoseCellNetwork.prototype.x = function(){
  return this.bestX;
}

PoseCellNetwork.prototype.y = function(){
  return this.bestY;
}

PoseCellNetwork.prototype.theta = function(){
  return this.bestTheta;
}

PoseCellNetwork.prototype.getCells = function(){
  return this.posecells.reduce(function(reduced, val){
    var vals = val.reduce(function(reduced2, val2){
      return reduced2.concat(val2);
    }, []);

    return reduced.concat(vals);
  }, [])
};

//Cell distance from best cell to given cell indices
PoseCellNetwork.prototype.getDelta = function(x, y, theta){
  return Math.sqrt(
    Math.pow(
      this.getMinDelta(this.bestX, x, this.physicalDimensionsXY),
    2) +
    Math.pow(
      this.getMinDelta(this.bestY, y, this.physicalDimensionsXY),
    2) +
    Math.pow(
      this.getMinDelta(this.bestTheta, theta, this.rotationDimensionsTheta),
    2)
  );
};

//Because the cells wrap around need to check to see if traversing the wrap around
//is shorter than the normal path
PoseCellNetwork.prototype.getMinDelta = function(d1, d2, max){
  var absval = Math.abs(d1 - d2);
  return Math.min(absval, max - absval);
};

PoseCellNetwork.prototype.poseCellExciteHelper = function(x, y, z){
  var xl, yl, zl, xw, yw, zw, excite_index = 0;

	// loop in all dimensions
  var floor = this.exciteFloor;
  var ceil = this.exciteCeil;
	for (zl = z - floor; zl < z + ceil; zl++){
		for (yl = y - floor; yl < y + ceil; yl++){
			for (xl = x - floor; xl < x + ceil; xl++){
        // for every pose cell, multiply the current energy by
				// a pdf to spread the energy (pcExciteWidth is a 3d pdf [probability density function])
        //var unwrappedLocation = this.newCells.getUnwrappedLocation(zl,yl,xl);

        var zw = (zl + this.rotationDimensionsTheta)%this.rotationDimensionsTheta;
        var yw = (yl + this.physicalDimensionsXY)%this.physicalDimensionsXY;
        var xw = (xl + this.physicalDimensionsXY)%this.physicalDimensionsXY;

        this.newCells.partitionedCells[zw][yw][xw].value += this.cells.partitionedCells[z][y][x].value * this.pcExciteWidth[excite_index++];
        //this.newCells.set(newEnergy, zl, yl, xl);
        //excite_index++;
			}
		}
	}

	return true;
};

PoseCellNetwork.prototype.poseCellInhibitHelper = function(x, y, z){
  var xl, yl, zl, xw, yw, zw, inhib_index = 0;

  var floor = this.inhibitFloor;
  var ceil = this.inhibitCeil;
	// loop through all the dimensions
	for (zl = z - floor; zl < z + ceil; zl++) {
		for (yl = y - floor; yl < y + ceil; yl++) {
			for (xl = x - floor; xl < x + ceil; xl++) {

        //var unwrappedLocation = this.newCells.getUnwrappedLocation(zl,yl,xl);
        var zw = (zl + this.rotationDimensionsTheta)%this.rotationDimensionsTheta;
        var yw = (yl + this.physicalDimensionsXY)%this.physicalDimensionsXY;
        var xw = (xl + this.physicalDimensionsXY)%this.physicalDimensionsXY;
        this.newCells.partitionedCells[zw][yw][xw].value += this.cells.partitionedCells[z][y][x].value * this.pcInhibitWidth[inhib_index++];

        //inhib_index++;
			}
		}
	}

	return true;
};

PoseCellNetwork.prototype.normalise = function(){
  var i;
	var total = 0;
  for(var i = 0; i < this.numberOfCells; i++){
    total += this.cells.cells[i].value;
  }

	assert(total > 0, "No energy was present in the network, need to fix parameters");

  for(var i = 0; i < this.numberOfCells; i++){
    this.cells.cells[i].value /= total;
  }

	return true;
}

PoseCellNetwork.prototype.norm2d = function(variance, x, y, z, dimCenter){
  return 1/(variance*Math.sqrt(2*Math.PI))*
		Math.exp((-(x-dimCenter)*(x-dimCenter)-(y-dimCenter)*(y-dimCenter)-
		(z-dimCenter)*(z-dimCenter))/(2*variance*variance));
};

PoseCellNetwork.prototype.toJson = function(){
  var json = {
    config: this.config,
    best: [this.theta(), this.y(), this.x()],
    cells: this.cells.partitionedCells
  };

  return JSON.stringify(json);
};

function round(num){
  if(Math.ceil(num) - num < .5){
    return Math.ceil(num);
  } else {
    return Math.floor(num);
  }
}

function get1dWeight(cellCenter, realPoint){
  return 1 - Math.abs(Math.abs(cellCenter) - Math.abs(realPoint));
}



module.exports = PoseCellNetwork;
