uniform sampler2D texture;
uniform float speedFactor;
uniform float spinFactor;
varying vec2 q;

#define INIT_COLOR vec4(0.5, 0.5, 0.5, 1.0)
#define COLOR1 vec4(0.61, 0.05, 0.1, 1.0)
#define COLOR2 vec4(1.0, 0.0, 0.0, 1.0)


void main(void) {
	vec4 texColor = texture2D(texture, q);
	vec4 c1 = (1.0 - spinFactor) * INIT_COLOR + spinFactor * COLOR1;
	gl_FragColor = texColor * ((1.0 - speedFactor) * c1 + speedFactor * COLOR2);
}