varying vec2 q;
uniform sampler2D sourceImage;
uniform sampler2D depthMap;
uniform float randomBase;

float rand(vec2 co){
	return clamp(fract(sin(dot(co.xy, vec2(12.44, 8.65))) * randomBase), 0.0, 1.0);
}

void main(void) {
	vec4 c = texture2D(sourceImage, q) +
		texture2D(sourceImage, vec2(q.x + 1.0, q.y)) * 0.05 +
		texture2D(sourceImage, vec2(q.x - 1.0, q.y)) * 0.05 +
		texture2D(sourceImage, vec2(q.x, q.y + 1.0)) * 0.05 +
		texture2D(sourceImage, vec2(q.x, q.y - 1.0)) * 0.05;
	
	for (float i = 0.0; i < 100.0; i++) {
		vec4 b = texture2D(sourceImage, vec2(q.x, q.y + 0.1 - i * 0.002)) * (0.5 - abs(i / 100.0 - 0.5)) * 0.02;
		b.y *= 0.5;
		c += b;
	}
	c = clamp(c, 0.0, 1.0);
	
	gl_FragColor = c * (0.6 + 0.4 * rand(gl_FragCoord.xy));
}