varying float t;
uniform vec2 resolution;

void main(void) {
	float g = min(2.0 * gl_FragCoord.y / resolution.y, 0.8);
	gl_FragColor = vec4(g, t, t, 1.0 - t);
}