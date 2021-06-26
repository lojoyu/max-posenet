let video;
let poseNet;
let poses = [];

let x, y;
let socket;

function setup() {
	createCanvas(640, 480);
	setupOsc(12000, 3334);
	video = createCapture(VIDEO);
	poseNet = ml5.poseNet(video,'single', modelReady);
	poseNet.on('pose', function(results) {
	  poses = results;
	});
	video.hide();
}

function modelReady() {
}

function draw() {
	image(video, 0, 0, width, height);
	drawKeypoints();
	drawSkeleton();
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints()  {
	// Loop through all the poses detected
	for (let i = 0; i < poses.length; i++) {
	  // For each pose detected, loop through all the keypoints
	  let pose = poses[i].pose;
	  for (let j = 0; j < pose.keypoints.length; j++) {
		// A keypoint is an object describing a body part (like rightArm or leftShoulder)
		let keypoint = pose.keypoints[j];
		// Only draw an ellipse is the pose probability is bigger than 0.2
		if (keypoint.score > 0.2) {
			
			x = keypoint.position.x;
			y = keypoint.position.y;
			fill(255, 0, 0);
			noStroke();
			circle(keypoint.position.x, keypoint.position.y, 10);
			sendOsc('/poseNet/'+j,[x,y]);
			
		}
	  }
	}
  }
  
  // A function to draw the skeletons
  function drawSkeleton() {
	// Loop through all the skeletons detected
	for (let i = 0; i < poses.length; i++) {
	  let skeleton = poses[i].skeleton;
	  // For every skeleton, loop through all body connections
	  for (let j = 0; j < skeleton.length; j++) {
		let partA = skeleton[j][0];
		let partB = skeleton[j][1];
		stroke(255, 0, 0);
		line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
	  }
	}
  }

function sendOsc(address, value) {
	socket.emit('message', [address].concat(value));
}

function setupOsc(oscPortIn, oscPortOut) {
	socket = io.connect('http://127.0.0.1:8081', { port: 8081, rememberTransport: false });
	socket.on('connect', function() {
		socket.emit('config', {	
			server: { port: oscPortIn,  host: '127.0.0.1'},
			client: { port: oscPortOut, host: '127.0.0.1'}
		});
	});
	socket.on('message', function(msg) {
		if (msg[0] == '#bundle') {
			for (var i=2; i<msg.length; i++) {
				receiveOsc(msg[i][0], msg[i].splice(1));
			}
		} else {
			receiveOsc(msg[0], msg.splice(1));
		}
	});
}
