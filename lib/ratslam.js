var ExperienceMap = require("./experience-map");
var PoseCellNetwork = require("./pose-cell-network");
var VisualCellNetwork = require("./visual-cell-network");

function RatSlam(config){
  this.map = new ExperienceMap(config.experience_map_settings);
  this.pcNetwork = new PoseCellNetwork(config.pose_cell_network_settings);
  this.vcNetwork = new VisualCellNetwork(config.visual_cell_network_settings);

  this.vtrans = config.init_vtrans;
  this.vrotation = config.init_vrotation;

  this.time_diff = config.init_time_diff;
  this.time_s = 0;

  //injected energy factor for visual cells
  this.pc_vc_inject_energy = config.pc_vc_inject_energy;

  this.pc_translation_scale = config.pc_translation_scale;

  //threshold for creating new experiences
  this.experience_delta_pose_cell_threshold = config.experience_delta_pose_cell_threshold;

  //create initial experience
  this.map.createExperience(this.pcNetwork.x, this.pcNetwork.y, this.pcNetwork.theta, 0);

  this.frame_count = 0;
}

//This is the main processing function of ratslam.
//It should be invoked when new visual and odometry data are
//ready for processing
RatSlam.prototype.process = function(){

  // read odometry
	// diff = current_time - last_time;
	this.vtrans = this.vtrans * this.time_diff;
	this.vrotation = this.vrotation * this.time_diff;

  this.vcNetwork.convertViewToViewTemplate();
	var prev_vt = vcNetwork.getCurrentVt();

  //Compare new view
  var vdata = this.vcNetwork.compare();
  var vError = vdata.vError;
  var vMatchId = vdata.vMatchId;

  //If error is sufficiently low from the visual cells, then we assume
  //vc's are trustworthy and pose cells should conform to the visual cells
  //pose associated with the current view
  //Else the visual cells should conform to the pose cells position
  if (vError <= this.vcNetwork.getVtMatchThreshold())
	{
		this.vcNetwork.setCurrentVt(vMatchId);

		var energy = this.pc_vc_inject_energy * 1.0/30.0 * (30.0 - Math.exp(1.2 * this.vcNetwork.getDecay(this.vcNetwork.getCurrentVt())));
		if (energy > 0)
		{
			this.pcNetwork.inject(this.vcNetwork.getCurrentXPc(), this.vcNetwork.getCurrentYPc(), this.vcNetwork.getCurrentZPc(), energy);
		} else {
			energy = 0;
		}
	}
	else
	{
		this.vcNetwork.setCurrentVt(this.vcNetwork.createTemplate(this.pcNetwork.x, this.pcNetwork.y, this.pcNetwork.theta);
	}

  /*
	** pose cell iteration
	*/
	this.pcNetwork.excite();
	this.pcNetwork.inhibit();
	this.pcNetwork.globalInhibit();
	this.pcNetwork.normalise();
	// todo: the pc network should really know how to convert vtrans ... do this by telling it the distance between posecells
	this.pcNetwork.pathIntegration(this.vtrans*this.pc_translation_scale, this.vrot);
	this.pcNetwork.findBest();

  /*
	** experience map iteration.
	*/
	var experience;
	var delta_pc;
	var new_exp;

	this.map.integratePosition(this.vtrans, this.vrot);

	experience = this.map.getExperience(map.getCurrentId());
	delta_pc = this.pcNetwork.getDeltaPc(experience.x_pc, experience.y_pc, experience.theta_pc);


	if (this.vcNetwork.getCurrentExpSize() == 0)
	{
		new_exp = this.map.createExperience(this.pcNetwork.x, this.pcNetwork.y, this.pcNetwork.theta, this.time_diff);
		this.map.setCurrentId(new_exp);
		this.vcNetwork.addExpToCurrent(new_exp);
	}
	else if (delta_pc > this.experience_delta_pose_cell_threshold || this.vcNetwork.getCurrentVt() != prev_vt)
	{
		// go through all the exps associated with the current view and find the one with the closest delta_pc

		var matched_exp_id = -1;
		var i;
		var min_delta_id;
		var min_delta = Number.MAX_VALUE;
		var delta_pc;

		// find the closest experience in pose cell space
		for (i = 0; i < this.pcNetwork.getCurrentExpSize(); i++)
		{
			experience = this.map.getExperience(this.vcNetwork.getCurrentExpLink(i));
			delta_pc = this.pcNetwork.getDeltaPc(experience.x_pc, experience.y_pc, experience.theta_pc);

			if (delta_pc < min_delta)
			{
				min_delta = delta_pc;
				min_delta_id = this.vcNetwork.getCurrentExpLink(i);
			}
		}

		// if an experience is closer than the thres create a link
		if (min_delta < this.experience_delta_pose_cell_threshold)
		{
			matched_exp_id = min_delta_id;
			this.map.createLink(this.map.getCurrentId(), matched_exp_id, this.time_diff);
		}

		if (this.map.getCurrentId() != matched_exp_id)
		{
			if (matched_exp_id == -1)
			{
				new_exp = this.map.createExperience(this.pcNetwork.x, this.pcNetwork.y, this.pcNetwork.theta, this.time_diff);
				this.map.setCurrentId(new_exp);
  			this.vcNetwork.addExpToCurrent(new_exp);
			}
			else
			{
				this.map.setCurrentId(matched_exp_id);
			}
		} else if (this.vcNetwork.getCurrentVt() === prev_vt) {
			new_exp = this.map.createExperience(this.pcNetwork.x, this.pcNetwork.y, this.pcNetwork.theta, this.time_diff);
			this.map.setCurrentId(new_exp);
			this.vcNetwork.addExpToCurrent(new_exp);
		}
	}

	this.map.iterate();

	this.map.calculatePathToPoal(this.time_s);
	this.map.getGoalWaypoint();

	this.frame_count++;

}

//Set the vc_view
RatSlam.prototype.setView = function(viewData){
  this.vcNetwork.setView(viewData);
}

//Set the odometry data
RatSlam.prototype.setOdom = function(trans, rotation){
  this.vtrans = trans;
  this.vrotation = rotation;
}

RatSlam.prototype.setDiffTime = function(diffTime){
  this.time_diff = time_diff;
  this.time_s += diffTime;
}
