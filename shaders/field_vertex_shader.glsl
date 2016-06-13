varying vec3 N;
varying vec3 v;

varying vec4 p;
varying vec4 q;

void main(void) {
	v = vec3(modelViewMatrix * vec4(position, 1.0));
	N = normalize(normalMatrix * normal);
	
	p = vec4(position, 1.0);
	q = projectionMatrix * modelViewMatrix * p;
	gl_Position = q;
}