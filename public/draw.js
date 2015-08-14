
define(function(require){
  var pcnService = require("get-pose-cells");
  require("three");
  var scene, camera, renderer;
  var geometry, material, mesh;
  var meshes=[];
  var cameraAngle = 0;
  var orbitRange = 1000;

  function animate(){
    requestAnimationFrame( animate );
    //console.log(meshes)
    console.log("animate");
    renderer.render( scene, camera );
  }

  return {
    init: function(){
      pcnService.getPoseData().success(function(data){
        data = JSON.parse(data);
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.z = 1000;


        for(var k = 0; k < data.config.rotation_dimensions_theta; k++){
          meshes[k] = meshes[k] || [];
          for(var j = 0; j < data.config.physical_dimensions_xy; j++){
            meshes[k][j] = meshes[k][j] || [];
            for(var i = 0; i < data.config.physical_dimensions_xy; i++){
              var energy = data.cells[k][j][i].value * 15;

              geometry = new THREE.BoxGeometry( 30, 30, 30 );

              if(energy > 0.01){
                material = new THREE.MeshNormalMaterial( { wireframe:true, transparent: true, opacity: energy } )
                //material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false } );
              } else {
                material = new THREE.MeshNormalMaterial( { transparent: true, opacity: 0.0 } )
                //material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false, transparent:true } );
              }

              mesh = new THREE.Mesh( geometry, material );

              mesh.position.x =  30*k - 30 * data.config.rotation_dimensions_theta/2
              mesh.position.y =  30*j - 30 * data.config.physical_dimensions_xy/2
              mesh.position.z =  30*i - 30 * data.config.physical_dimensions_xy/2

              meshes[k][j].push(mesh);
              scene.add( mesh );
              //console.log(mesh)
            }
          }
        }

        geometry = new THREE.BoxGeometry( data.config.rotation_dimensions_theta*30, data.config.physical_dimensions_xy*30, data.config.physical_dimensions_xy*30 );

          //material = new THREE.MeshNormalMaterial( { transparent: true, opacity: energy } )
        material = new THREE.MeshBasicMaterial( { color: 0xa00000, wireframe: true } );

        mesh = new THREE.Mesh( geometry, material );
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0;
        scene.add( mesh );

        renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );

        document.body.appendChild( renderer.domElement );
        camera.lookAt(mesh.position)
        //camera.position.x = Math.sin(Math.PI/2) * 10000/Math.PI/4;
        renderer.render( scene, camera );
      });
    },
    update: function(){
      pcnService.movePoseData().success(function(){
        pcnService.getPoseData().success(function(data){
          data = JSON.parse(data);
          for(var k = 0; k < data.config.rotation_dimensions_theta; k++){
            for(var j = 0; j < data.config.physical_dimensions_xy; j++){
              for(var i = 0; i < data.config.physical_dimensions_xy; i++){
                var energy = data.cells[k][j][i].value * 15;
                meshes[k][j][i].material.opacity = energy;

              }
            }
          }
          //cameraAngle += .25;
          //camera.position.x = Math.cos(cameraAngle) * orbitRange;
          //camera.position.y = Math.sin(cameraAngle) * orbitRange;
          renderer.render( scene, camera );
        });
      });
    }
  }
});
