attribute float transp;
varying float t;

void main(void) {
	t = transp;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}