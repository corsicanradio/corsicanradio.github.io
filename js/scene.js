function getFile(fileName) {
	return $.ajax({url: fileName, async: false}).responseText;
}

/* --------------------------------------------------------------------------------------------------- */

var renderer;
var mainView;
var postView;
var aspectRatio = window.innerWidth / window.innerHeight;

/* --------------------------------------------------------------------------------------------------- */

function start() {
	var render = function () {
		mainView.mouseClick = mainView.mouseClickPrevCycle;
		mainView.mouseClickPrevCycle = false;
		
		for(x in mainView.objects) {
			mainView.objects[x].beforeRender();
		}
		
		for(x in postView.objects) {
			postView.objects[x].beforeRender();
		}
		
		requestAnimationFrame(render);
		renderer.render(mainView.scene, mainView.camera, mainView.renderTarget);
		renderer.render(postView.scene, postView.camera);
	};

	render();
};

/* --------------------------------------------------------------------------------------------------- */

function ViewAncestor() {
	this.unqSequence = 0;
	this.objects = {};
	
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 20000);
}

ViewAncestor.prototype.add = function(obj) {
	var id = 'i' + (this.unqSequence++);
	this.objects[id] = obj;
	return id;
}

ViewAncestor.prototype.remove = function(id) {
	delete this.objects[id];
}

ViewAncestor.prototype.onResize = function() {
	this.camera.aspect = aspectRatio;
	this.camera.updateProjectionMatrix();
}

/* --------------------------------------------------------------------------------------------------- */

View.prototype = Object.create(ViewAncestor.prototype);
function View() {
	ViewAncestor.call(this)
	this.mouse = {
		screenX: 0,
		screenY: 0,
		worldX: 0,
		worldY: 0
	};
	
	this.camera.position.z = 5;
	
	this.mouseClickPrevCycle = false;
	this.mouseClick = false;
	
	var light = new THREE.AmbientLight(0x330406);
	this.scene.add(light);
	this.depthTexture = new THREE.DepthTexture();
	this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
		minFilter: THREE.NearestFilter, 
		magFilter: THREE.NearestFilter, 
		format: THREE.RGBFormat,
		depthBuffer: true,
		depthTexture: this.depthTexture
	});
}

View.prototype.onMove = function(x, y) {
	this.mouse.screenX = x; 
	this.mouse.screenY = y;
	
	var v = new THREE.Vector3();
	v.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5);
	v.unproject(this.camera);
	var d = v.sub(this.camera.position).normalize();
	var s = -this.camera.position.z / d.z;
	var p = this.camera.position.clone().add(d.multiplyScalar(s));
	
	this.mouse.worldX = p.x;
	this.mouse.worldY = p.y;
};

View.prototype.onResize = function() {
	ViewAncestor.prototype.onResize.call(this);
	this.renderTarget.width = window.innerWidth;
	this.renderTarget.heigth = window.innerHeight;
}

/* --------------------------------------------------------------------------------------------------- */

PostView.prototype = Object.create(ViewAncestor.prototype);
function PostView(mainView) {
	ViewAncestor.call(this);
	this.mainView = mainView;
	this.camera.position.z = 2.415;
	this.postFilter = new PostFilter([this]);
}

PostView.prototype.onResize = function() {
	ViewAncestor.prototype.onResize.call(this);
	this.postFilter.onResize();
}

/* --------------------------------------------------------------------------------------------------- */

function SceneObject(views) {	
	this.views = views;
	this.ids = [];
	for (i = 0; i < this.views.length; ++i) {
		this.ids[i] = 'x'
	}
};

SceneObject.prototype.add = function() {
	for (i = 0; i < this.views.length; ++i) {
		this.ids[i] = this.views[i].add(this);
		this.views[i].scene.add(this.getObject(i));
	}
};

SceneObject.prototype.remove = function() {
	for (i = 0; i < this.views.length; ++i) {
		if ((typeof this.ids[i] != 'undefined') && (this.ids[i] != 'x')) {
			this.views[i].remove(this.ids[i]);
			this.views[i].scene.remove(this.getObject(i));
			this.ids[i].id = 'x'
		}
	}
};

SceneObject.prototype.beforeRender = function() {};
SceneObject.prototype.getObject = function(i) {};

/* --------------------------------------------------------------------------------------------------- */

Phrase.prototype = Object.create(SceneObject.prototype);
function Phrase(views, params) {
	SceneObject.call(this, views);
	
	this.params = params;
	this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.TextureLoader().load(this.params.src), color: 0xffffff, fog: false})),
	
	this.init();	
	this.add();
};

Phrase.prototype.getObject = function(i) {
	return this.sprite;
}

Phrase.prototype.init = function() {
	this.a = this.params.calcPos();
	this.b = this.a;
	this.sprite.scale.set(this.a.scaleX, this.a.scaleY, this.a.scaleZ);
	this.sprite.position.set(this.a.posX, this.a.posY, this.a.posZ);
};

Phrase.prototype.beforeRender = function() {
	this.b = this.params.calcPos();	
	
	for(x in this.a) {
		this.a[x] += (this.b[x] - this.a[x]) * this.params.speed;
	}
	
	this.sprite.scale.set(this.a.scaleX, this.a.scaleY, this.a.scaleZ);
	this.sprite.position.set(this.a.posX, this.a.posY, this.a.posZ);
};

/* --------------------------------------------------------------------------------------------------- */

function Bezier(points, stepCount) {
	if (points.length < 2) {
		throw new Error("bezier: points < 2");
	}
	
	this.points = points;
	this.stepCount = stepCount;
}

Bezier.prototype.stepBetween = function(i, tempPoints) {
	if (tempPoints.length == 1) {
		return tempPoints[0];
	}
	else {
		var newTempPoints = [];
		for (x = 0; x < tempPoints.length - 1; ++x) {
			newTempPoints[x] = {};
			for (y in tempPoints[x]) {
				newTempPoints[x][y] = tempPoints[x][y] + (i * (tempPoints[x + 1][y] - tempPoints[x][y]) / this.stepCount);
			}
		}
		return this.stepBetween(i, newTempPoints);
	}
}

Bezier.prototype.step = function(i) {
	return this.stepBetween(i, this.points);
}

Bezier.prototype.continueCurve = function(points) {
	var newPoints = [];
	newPoints[0] = this.points[this.points.length - 1];
	newPoints[1] = {};
	for(x in this.points[this.points.length - 2]) {
		newPoints[1][x] = (1.1 * this.points[this.points.length - 1][x]) - (this.points[this.points.length - 2][x] * 0.1);
	}
	
	this.points = newPoints.concat(points);
}

/* --------------------------------------------------------------------------------------------------- */

FlyingLight.prototype = Object.create(SceneObject.prototype);
function FlyingLight(views, color) {
	SceneObject.call(this, views);
	
	this.light = new THREE.PointLight(color, 1, 100);
	this.init();
	this.add();
};

FlyingLight.prototype.getObject = function(i) {
	return this.light;
};

FlyingLight.prototype.random = function() {
	return {
		x: (Math.random() - 0.5) * 5,
		y: (Math.random() - 0.5) * 5,
		z: (Math.random() - 0.5) * 5,
	};
};

FlyingLight.prototype.init = function() {
	var bezierPoints = [];
	var bezierSteps = 2 + Math.floor(Math.random() * 5);
	for (x = 0; x < bezierSteps; ++x) {
		bezierPoints[x] = this.random();
	}
	
	this.currentStep = 0;
	this.bezier = new Bezier(bezierPoints, 100 + (Math.random() * 100));
	this.light.position.set(bezierPoints[0].x, bezierPoints[0].y, bezierPoints[0].z);
};

FlyingLight.prototype.beforeRender = function() {
	var a = this.bezier.step(this.currentStep++);
	if (this.currentStep > this.bezier.stepCount) {
		var p = [];
		for (i = 0; i < this.bezier.points.length - 2; ++i) {
			p[i] = this.random();
		}
		this.bezier.continueCurve(p);
		this.currentStep = 0;
	}
	
	this.light.position.set(a.x, a.y, a.z);
}

/* --------------------------------------------------------------------------------------------------- */

FlyingParticle.prototype = Object.create(SceneObject.prototype);
function FlyingParticle(shapeCallback, views) {
	SceneObject.call(this, views);
	this.particleMesh = shapeCallback.call(this);
	this.init();
	this.add();
};

FlyingParticle.prototype.getObject = function(i) {
	return this.particleMesh;
}

FlyingParticle.prototype.random = function() {
	return {
		posX: (Math.random() - 0.5) * 10,
		posY: (Math.random() - 0.5) * 7,
		posZ: (Math.random() - 0.5) * 5,
		
		rotX: (Math.random() - 0.5) * Math.PI * 2,
		rotY: (Math.random() - 0.5) * Math.PI * 2,
		rotZ: (Math.random() - 0.5) * Math.PI * 2,
	};
}

FlyingParticle.prototype.init = function() {
	var bezierPoints = [];
	var bezierSteps = 2 + Math.floor(Math.random() * 5);
	for (x = 0; x < bezierSteps; ++x) {
		bezierPoints[x] = this.random();
	}
	
	this.currentStep = 0;
	this.bezier = new Bezier(bezierPoints, 1000 + (Math.random() * 1000));
	this.particleMesh.position.set(bezierPoints[0].posX, bezierPoints[0].posY, bezierPoints[0].posZ);
	this.particleMesh.rotation.set(bezierPoints[0].rotX, bezierPoints[0].rotY, bezierPoints[0].rotZ);
};

FlyingParticle.prototype.beforeRender = function() {	
	var a = this.bezier.step(this.currentStep++);
	if (this.currentStep > this.bezier.stepCount) {
		var p = [];
		for (i = 0; i < this.bezier.points.length - 2; ++i) {
			p[i] = this.random();
		}
		this.bezier.continueCurve(p);
		this.currentStep = 0;
	}
	
	this.particleMesh.rotation.set(a.rotX, a.rotY, a.rotZ);
	this.particleMesh.position.set(a.posX, a.posY, a.posZ);
}

/* --------------------------------------------------------------------------------------------------- */

FlyingLine.prototype = Object.create(SceneObject.prototype);
FlyingLine.prototype.B_STEPS = 30;
function FlyingLine(segments, views) {
	SceneObject.call(this, views);
	
	this.shader = new THREE.ShaderMaterial({
		uniforms: {
			resolution: {value: new THREE.Vector2(window.innerWidth, window.innerHeight)}
		},
		
		vertexShader: getFile("shaders/line_vertex_shader.glsl"),
		fragmentShader: getFile("shaders/line_fragment_shader.glsl")
	});
	
	this.shader.transparent = true;
	this.shader.blending = THREE.AdditiveBlending;
	
	this.segments = segments;
	var bezierPoints = [];
	var bezierSteps = 2 + Math.floor(Math.random() * 5);
	for (x = 0; x < bezierSteps; ++x) {
		bezierPoints[x] = this.random();
	}
	
	this.bezier = new Bezier(bezierPoints, this.B_STEPS);	
	this.geometry = new THREE.BufferGeometry();
	var position = new Float32Array(this.segments * 3);
	var transp = new Float32Array(this.segments);
	for (i = 0; i < this.segments; ++i) {
		var a = this.bezier.step(i);
		position[i * 3] = a.x;
		position[i * 3 + 1] = a.y;
		position[i * 3 + 2] = a.z;
		transp[i] = 1 - ((this.segments - i + 1) / this.segments);
	}
	
	this.geometry.addAttribute('position', new THREE.BufferAttribute(position, 3));
	this.geometry.addAttribute('transp', new THREE.BufferAttribute(transp, 1));
	
	this.currentStep = this.B_STEPS - this.segments;
	this.line = new THREE.Line(this.geometry, this.shader);
	this.add();
};

FlyingLine.prototype.getObject = function(i) {
	return this.line;
}

FlyingLine.prototype.random = function() {
	return {
		x: (Math.random() - 0.5) * 10,
		y: (Math.random() - 0.5) * 7,
		z: (Math.random() - 0.5) * 5
	};
}

FlyingLine.prototype.top = function() {
	return new THREE.Vector3(
		this.geometry.attributes.position.array[0], 
		this.geometry.attributes.position.array[1], 
		this.geometry.attributes.position.array[2]
	);
}

FlyingLine.prototype.beforeRender = function() {
	var a = this.bezier.step(this.currentStep++);
	if (this.currentStep > this.bezier.stepCount) {
		var p = [];
		for (i = 0; i < this.bezier.points.length - 2; ++i) {
			p[i] = this.random();
		}
		this.bezier.continueCurve(p);
		this.currentStep = 0;
	}	
	
	for (i = this.geometry.attributes.position.array.length - 1; i > 0; --i) {
		this.geometry.attributes.position.array[i] = this.geometry.attributes.position.array[i - 3]; 
	}
	this.geometry.attributes.position.array[0] = a.x;
	this.geometry.attributes.position.array[1] = a.y;
	this.geometry.attributes.position.array[2] = a.z;
	
	this.geometry.verticesNeedUpdate = true;
	this.geometry.attributes.position.needsUpdate = true;
}

/* --------------------------------------------------------------------------------------------------- */

ConnectedVerticle.prototype = Object.create(THREE.Vector3.prototype);
function ConnectedVerticle(x, y, z, is_border, force) {
	THREE.Vector3.call(this, x, y, z);
	this.neighbors = [];
	this.is_border = is_border;
	this.force = force;
}

ConnectedVerticle.prototype.addNeighbor = function(cv) {
	if (this.neighbors.indexOf(cv) == -1) {
		this.neighbors.push(cv);
	}
}

ConnectedVerticle.prototype.laplasianSmooth = function() {
	if (this.is_border == true) {
		return;
	}
	
	q = new THREE.Vector3();
	q.copy(this);
	for (x in this.neighbors) {
		q.add(this.neighbors[x]);
	}
	
	var l = this.neighbors.length + 1;
	q.x /= l;
	q.y /= l;
	q.z /= l;
	
	if (q.distanceTo(this) > 0.01) {
		this.x += (q.x - this.x) * 0.7;
		this.y += (q.y - this.y) * 0.7;
		this.z += (q.z - this.z) * 0.7;
	}
	
	for(x in this.force) {
		if (this.is_border == false) {
			this.x += (this.force[x].x - this.x) * 0.002;
			this.z += (this.force[x].z - this.z) * 0.002;
		}
		this.y += this.force[x].speed * Math.max(1.0 - Math.sqrt(Math.pow(this.x - this.force[x].x, 2) + Math.pow(this.z - this.force[x].z, 2)), 0.0) * 0.01;
	}
}

/* --------------------------------------------------------------------------------------------------- */

Field.prototype = Object.create(SceneObject.prototype);
Field.prototype.WIDTH = 51;
Field.prototype.HEIGHT = 51;
Field.prototype.STEP = 0.2;

function Field(views, lightSources, type) {
	SceneObject.call(this, views);
	this.type = type;
	
	this.force = [];
	for (x = 0; x < 2; ++x) { 
		this.force.push({
			x: 0,
			z: 0,
			speed: 0,
			acceleration: 0.1
		});
	}
	
	var q = Math.floor(this.WIDTH / 2);
	var p = Math.floor(this.HEIGHT / 2);
	this.geometry = new THREE.Geometry();
	for (z = 0; z < this.HEIGHT; ++z) {
		for (x = 0; x < this.WIDTH; ++x) {
			var b = (((z != 0) && (z != this.HEIGHT - 1) && (x != 0) && (x !=this.WIDTH - 1)) == false);
			this.geometry.vertices.push(new ConnectedVerticle(
				(x - q) * this.STEP, 
				-1.5 + (Math.random() * 0.1 - 0.05) * (b ? 0 : 1), 
				(z - p) * this.STEP, b, this.force));
		}
		
		if (z != 0) {
			for (x = 0; x < this.WIDTH; ++x) {
				if (x != 0) {
					this.geometry.faces.push(new THREE.Face3(
						(z * this.WIDTH) + x,
						((z - 1) * this.WIDTH) + x, 
						(z * this.WIDTH) + x - 1));
						
					this.connectTriangle(
						(z * this.WIDTH) + x,
						((z - 1) * this.WIDTH) + x, 
						(z * this.WIDTH) + x - 1
					);
				}
				
				if (x != this.WIDTH - 1) {
					this.geometry.faces.push(new THREE.Face3(
						(z * this.WIDTH) + x,
						((z - 1) * this.WIDTH) + x + 1,
						((z - 1) * this.WIDTH) + x));
					
					this.connectTriangle(
						(z * this.WIDTH) + x,
						((z - 1) * this.WIDTH) + x, 
						(z * this.WIDTH) + x - 1
					);
				}
			}
		}
	}
	
	this.lightSources = lightSources;
	
	this.shader = new THREE.ShaderMaterial({
		uniforms: {
			resolution: {value: new THREE.Vector2(window.innerWidth, window.innerHeight)},
			lightSources: {type: 'v3v', value: this.getLightSources()},
			lightColor: {value: (this.type == 1 ? new THREE.Vector4(0.5, 0, 0, 0) : new THREE.Vector4(0, 0.5, 0.7, 0))},
			factor1: {type: 'f', value: (this.type == 1 ? 0.7 : 1.2)}
		},
		
		vertexShader: getFile("shaders/field_vertex_shader.glsl"),
		fragmentShader: getFile("shaders/field_fragment_shader.glsl"),
		wireframe: true
	});
	
	this.shader.transparent = true;
	this.shader.blending = THREE.AdditiveBlending;
	
	this.geometry.computeBoundingSphere();
	this.field = new THREE.Mesh(this.geometry, this.shader);
	
	this.field.position.set(0, 0, -2);	
	this.add();
};

Field.prototype.getLightSources = function() {
	var r = [];
	for(x in this.lightSources) {
		r.push(this.lightSources[x].top());
	}
	return r;
}

Field.prototype.connectTriangle = function(a, b, c) {
	q = this.geometry.vertices[a];
	p = this.geometry.vertices[b];
	e = this.geometry.vertices[c];
	
	q.addNeighbor(p);
	q.addNeighbor(e);
	
	p.addNeighbor(q);
	p.addNeighbor(e);
	
	e.addNeighbor(q);
	e.addNeighbor(p);
}

Field.prototype.getObject = function(i) {
	return this.field;
}

Field.prototype.beforeRender = function() {
	for (x in this.force) {
		if (Math.abs(this.force[x].speed) < 2 * this.force[x].acceleration) {
			this.force[x].x = Math.random() * 10 - 5;
			this.force[x].z = Math.random() * 10 - 5;
			this.force[x].speed = -10.0 * Math.random() * Math.sign(Math.random() - 0.5);
		}
		else {
			if (this.force[x].speed > 0) {
				this.force[x].speed -= this.force[x].acceleration;
			}
			else {
				this.force[x].speed += this.force[x].acceleration;
			}
		}
	}

	for (i in this.geometry.vertices) {
		var p = this.geometry.vertices[i];
		p.laplasianSmooth();
	}
	this.geometry.verticesNeedUpdate = true;
	
	this.field.rotation.set(0, 0.5 * Math.PI * (this.views[0].mouse.screenX - (window.innerWidth / 2)) / window.innerWidth, 0);
	this.field.position.set(0, -(this.views[0].mouse.screenY / window.innerHeight) + 0.5, -2);
	
	this.shader.uniforms.lightSources = {type: 'v3v', value: this.getLightSources()};
	this.shader.needsUpdate = true;
}

/* --------------------------------------------------------------------------------------------------- */

Mark404.prototype = Object.create(SceneObject.prototype);

Mark404.prototype.WIDTH = 1536;
Mark404.prototype.HEIGHT = 768;
Mark404.prototype.SIZE = 32;
Mark404.prototype.FONT = "Bold 500px Arial";
Mark404.prototype.COLOR = "rgba(255, 255, 255, 1.0)";
Mark404.prototype.TEXT_X = 0;
Mark404.prototype.TEXT_Y = 500;
Mark404.prototype.PIECE_SIZE = 0.05;

Mark404.prototype.SEGMENT_COUNT = Mark404.prototype.WIDTH * Mark404.prototype.HEIGHT / Math.pow(Mark404.prototype.SIZE, 2);

/* --------------------------------------------------------------------------------------------------- */

function Mark404Spin(side) {
	this.value = Math.random() * Math.PI * 2;
	this.speed = Math.sign(side) * Math.random() * 0.1;
}

Mark404Spin.prototype.step = function() {
	this.value += this.speed;
	
	if (this.value > Math.PI * 2) {
		this.value -= Math.PI * 2;
	}
	
	if (this.value < 0) {
		this.value += Math.PI * 2;
	}
}

Mark404Spin.prototype.stepAll = function(spinArray) {
	for (x in spinArray) {
		spinArray[x].step();
	} 
}

/* --------------------------------------------------------------------------------------------------- */

function Mark404Elem(parent, x, y) {
	this.parent = parent;
	this.x = x;
	this.y = y;
	
	this.r = Math.random() * 2;
	this.speed = 0.05 + Math.random() / 10; 
	
	this.mainSpinRadiusDefault = 0.3 + (Math.random() - 0.5) * Math.random() * 0.3;
	this.mainSpinRadius = this.mainSpinRadiusDefault;
	this.mainSpinRadiusSpeedInit = 0.001;
	this.mainSpinRadiusSpeed = 0;
	this.mainSpinRadiusReturnSpeed = Math.random() * 0.1;
	this.mainSpinRadiusAcceleration = -Math.random() * 0.1;
	
	this.rotation = {
		mainSpin: new Mark404Spin(1),
		selfSpinX: new Mark404Spin(Math.random() - 0.5),
		selfSpinY: new Mark404Spin(Math.random() - 0.5),
		selfSpinZ: new Mark404Spin(Math.random() - 0.5),
	};
	
	this.a = this.calcPos();
	this.b = this.a;
	
	this.speedFactor = 0.0;
	this.spinFactor = 0.0;
}

Mark404Elem.prototype.calcPosDefault = function() {
	return {
		posX: -2.2 + (-this.parent.views[0].mouse.worldX / 10.0) + (this.parent.PIECE_SIZE * this.x * 1.2), 
		posY: 1.2 + (-this.parent.views[0].mouse.worldY / 10.0) - (this.parent.PIECE_SIZE * this.y * 1.2), 
		posZ: 0.0,
		
		rotX: 0.8, 
		rotY: 0.8, 
		rotZ: Math.PI
	};
}

Mark404Elem.prototype.calcPos = function() {
	var n = this.calcPosDefault();
	var d = {posX: n.posX, posY: n.posY, posZ: n.posZ};
	if (Math.sqrt(Math.pow(n.posX - this.parent.views[0].mouse.worldX, 2) + Math.pow(n.posY - this.parent.views[0].mouse.worldY, 2)) < this.r) {
		if (this.mainSpinRadiusSpeed > 0) {
			this.mainSpinRadiusSpeed += this.mainSpinRadiusAcceleration;
		}
		if (this.mainSpinRadiusSpeed < 0) {
			this.mainSpinRadiusSpeed = 0;
		}
		
		if (this.parent.views[0].mouseClick) {
			this.mainSpinRadiusSpeed = Math.random() * 0.5;
			this.mainSpinRadiusSpeedInit = this.mainSpinRadiusSpeed;
		}
		
		this.mainSpinRadius += this.mainSpinRadiusSpeed - ((this.mainSpinRadius - this.mainSpinRadiusDefault) * this.mainSpinRadiusReturnSpeed);
		
		n.posX = this.parent.views[0].mouse.worldX + this.mainSpinRadius * Math.cos(this.rotation.mainSpin.value);
		n.posY = this.parent.views[0].mouse.worldY - this.mainSpinRadius * Math.sin(this.rotation.mainSpin.value);
		
		n.rotX += this.rotation.selfSpinX.value;
		n.rotY += this.rotation.selfSpinY.value;
		n.rotZ += this.rotation.selfSpinZ.value;
		
		this.inMainSpin = true;
	}
	else {
		this.mainSpinRadius = this.mainSpinRadiusDefault;
		this.mainSpinRadiusSpeed = 0;
		
		this.inMainSpin = false;
	}
	
	return n;
}

Mark404Elem.prototype.step = function() {
	Mark404Spin.prototype.stepAll(this.rotation);
	this.b = this.calcPos();
	
	this.speedFactor = this.mainSpinRadiusSpeed / this.mainSpinRadiusSpeedInit;
	if (this.inMainSpin == true) {
		this.spinFactor = 1.0 - Math.min(Math.sqrt(Math.pow(this.a.posX - this.b.posX, 2) + Math.pow(this.a.posY - this.b.posY, 2) + Math.pow(this.a.posZ - this.b.posZ, 2)) * 5, 1.0);
	}
	else {
		this.spinFactor = Math.min(Math.sqrt(Math.pow(this.a.posX - this.b.posX, 2) + Math.pow(this.a.posY - this.b.posY, 2) + Math.pow(this.a.posZ - this.b.posZ, 2)) * 2, 1.0);
	}
	
	for(x in this.a) {
		this.a[x] += (this.b[x] - this.a[x]) * this.speed;
	}
}

/* --------------------------------------------------------------------------------------------------- */

function Mark404(views) {
	SceneObject.call(this, views);
	
	var canvas = document.createElement('canvas');
	canvas.width = this.WIDTH;
	canvas.height = this.HEIGHT;
	
	var context = canvas.getContext('2d');
	context.font = this.FONT;
	context.fillStyle = this.COLOR;
	context.fillText("404", this.TEXT_X, this.TEXT_Y);

	this.object404 = new THREE.Object3D();
	this.piecesAttributes = []
	
	for (x = 0; x < Math.floor(this.WIDTH / this.SIZE); ++x) {	
		for (y = 0; y < Math.floor(this.HEIGHT / this.SIZE); ++y) {
			var data = context.getImageData(x * this.SIZE, y * this.SIZE, this.SIZE, this.SIZE).data;
			for (q in data) {
				if (data[q] != 0) {					
					var pieceCanvas = document.createElement('canvas');
					pieceCanvas.width = this.SIZE;
					pieceCanvas.height = this.SIZE;
					var pieceContext = pieceCanvas.getContext('2d');
					
					pieceContext.drawImage(canvas, x * this.SIZE, y * this.SIZE, this.SIZE, this.SIZE, 0, 0, this.SIZE, this.SIZE);
					var m =
						new THREE.Mesh(
							new THREE.PlaneGeometry(this.PIECE_SIZE, this.PIECE_SIZE),						
							new THREE.ShaderMaterial({
								uniforms: {
									texture: {type: "t", value: new THREE.Texture(pieceCanvas)},
									speedFactor: {value: 0.0},
									spinFactor: {value: 0.0}
								},
								
								vertexShader: getFile("shaders/mark404_vertex_shader.glsl"),
								fragmentShader: getFile("shaders/mark404_fragment_shader.glsl")
							})
						);
					
					m.material.transparent = true;
					m.material.blending = THREE.MultiplicativeBlending;
					m.material.uniforms.texture.value.needsUpdate = true;
					
					var attrs = new Mark404Elem(this, x, y);					
					m.position.set(attrs.a.posX, attrs.a.posY, attrs.a.posZ);
					m.rotation.set(attrs.a.rotX, attrs.a.rotY, attrs.a.rotZ);
					
					this.object404.add(m);
					this.piecesAttributes.push(attrs);
					
					break;
				}
			}
		}
	}
	
	this.add();
};

Mark404.prototype.getObject = function(i) {
	return this.object404;
};

Mark404.prototype.beforeRender = function() {
	for(i in this.piecesAttributes) {
		q = this.piecesAttributes[i];
		q.step();
		this.object404.children[i].rotation.set(q.a.rotX, q.a.rotY, q.a.rotZ);
		this.object404.children[i].position.set(q.a.posX, q.a.posY, q.a.posZ);
		
		this.object404.children[i].material.uniforms.speedFactor.value = q.speedFactor;
		this.object404.children[i].material.uniforms.spinFactor.value = q.spinFactor;
		
		this.object404.children[i].material.needsUpdate = true;
	}
}

/* --------------------------------------------------------------------------------------------------- */

PostFilter.prototype = Object.create(SceneObject.prototype);
function PostFilter(views) {
	SceneObject.call(this, views);
	this.filterPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(aspectRatio * 2, 2),
		new THREE.ShaderMaterial({
			uniforms: {
				sourceImage: {type: "t", value: mainView.renderTarget.texture},
				depthMap: {type: "t", value: mainView.depthTexture},
				randomBase: {value: Math.random() * 1000}
			},
			
			vertexShader: getFile("shaders/post_vertex_shader.glsl"),
			fragmentShader: getFile("shaders/post_fragment_shader.glsl")
		})
	);
	this.add();
}

PostFilter.prototype.onResize = function() {
	this.filterPlane.geometry.vertices[0].x = -aspectRatio;
	this.filterPlane.geometry.vertices[1].x = aspectRatio;
	this.filterPlane.geometry.vertices[2].x = -aspectRatio;
	this.filterPlane.geometry.vertices[3].x = aspectRatio;
	this.filterPlane.geometry.verticesNeedUpdate = true;
}

PostFilter.prototype.getObject = function(i) {
	return this.filterPlane;
}

PostFilter.prototype.beforeRender = function() {
	this.filterPlane.material.uniforms.randomBase.value = Math.random() * 1000;
	this.filterPlane.material.needsUpdate = true;
}

/* --------------------------------------------------------------------------------------------------- */

$(document).ready(function() {	
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x000000, 1);
	document.body.appendChild(renderer.domElement);

	mainView = new View();
	var views = [mainView];
	
	new Phrase(views, {
		src: "images/phrase1.png",
		speed: 0.1,
		calcPos: function() {
			return {			
				scaleX: 4,
				scaleY: 1,
				scaleZ: 1,
				
				posX: (Math.sqrt(aspectRatio)) + aspectRatio - 1 - (mainView.mouse.worldX * 0.1),
				posY: 0.5 - ((mainView.mouse.worldY - 0.5) * 0.15),
				posZ: 0.0
			};
		}
	});
	
	new Phrase(views, {
		src: "images/phrase2.png",
		speed: 0.2,
		calcPos: function() {
			return {
				scaleX: 4,
				scaleY: 1,
				scaleZ: 1,
				
				posX: (Math.sqrt(aspectRatio)) + aspectRatio - 0.8 - (mainView.mouse.worldX * 0.06),
				posY: 0.2 - (mainView.mouse.worldY * 0.15),
				posZ: 0
			};
		}
	});
	
	new Phrase(views, {
		src: "images/phrase3.png",
		speed: 0.08,
		calcPos: function() {
			return {
				scaleX: 4,
				scaleY: 1,
				scaleZ: 1,
				
				posX: (Math.sqrt(aspectRatio)) + aspectRatio - 1.5 - (mainView.mouse.worldX * 0.1),
				posY: -0.3 - ((mainView.mouse.worldY - 0.3) * 0.15),
				posZ: 0
			};
		}
	});
	
	new FlyingLight(views, 0x9d0c13);
	new FlyingLight(views, 0x9d0c13);
	
	var phong = new THREE.MeshPhongMaterial({
		color: 0xdddddd,
		specular: 0xff0000
	});
	
	for (k = 0; k < 20; ++k) {
		new FlyingParticle(function() {
			this.particleGeom = new THREE.TetrahedronGeometry(0.1, 0);
			return new THREE.Mesh(this.particleGeom, phong);
		}, views);
	}
	
	for (k = 0; k < 20; ++k) {
		new FlyingParticle(function() {
			this.triangleShape = new THREE.Shape();
			this.triangleShape.moveTo(0, 0);
			this.triangleShape.lineTo(0, 0.3);
			this.triangleShape.lineTo(0.1732, 0.15);
			this.triangleShape.lineTo(0, 0);

			this.particleGeom = new THREE.ShapeGeometry(this.triangleShape);
			return new THREE.Mesh(this.particleGeom, phong);
		}, views);
	}
	
	var lightSources = [
		new FlyingLine(20, views),
		new FlyingLine(20, views),
		new FlyingLine(20, views),
		new FlyingLine(20, views)
	];
	new Field(views, lightSources, 1);
	new Field(views, lightSources, 2);
	
	new Mark404(views);
	
	postView = new PostView(mainView);
	start();
});

$(window).resize(function() {	
	renderer.setSize(window.innerWidth, window.innerHeight);
	aspectRatio = window.innerWidth / window.innerHeight;
	
	mainView.onResize();
	postView.onResize();
});

$(document).on("mousemove", function(event) {	
	mainView.onMove(event.pageX, event.pageY);
});

$(document).on("click", function(event) {	
	mainView.mouseClickPrevCycle = true;
});


