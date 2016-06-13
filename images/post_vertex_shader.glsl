varying vec2 q;

void main(void) {
	q = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}