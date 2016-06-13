#define MAX_LIGHTS 4

varying vec3 N;
varying vec3 v;   

varying vec4 p; 
varying vec4 q;

uniform vec2 resolution;
uniform vec3 lightSources[MAX_LIGHTS];
uniform vec4 lightColor;

uniform float factor1;

void main(void) {
	float a = 1.0 - min(abs(sin(p.x * 50.0)), abs(sin(p.z * 50.0)));
	float b = (pow((q.z - 15.0) / 15.0, 3.0) + pow((q.z - 15.0) / 15.0, 2.0)) * 6.75 / q.z;
	float c = 1.0 - pow(gl_FragCoord.y / resolution.y, 2.0);
	float d = pow(min(1.0, abs(p.y + 1.5)), factor1);
	vec4 s = clamp(vec4(a*c*d, a*d, a*d, b), 0.0, 1.0);
	
	vec4 Ispec = vec4(0.0, 0.0, 0.0, 0.0);
	for (int i = 0; i < MAX_LIGHTS; i++) {
		vec3 E = normalize(v);
		vec3 R = normalize(-reflect(normalize(lightSources[i] - v),N));
		Ispec += clamp(lightColor * pow(max(dot(R,E),0.0), 20.3), 0.0, 1.0);
	}
	
	gl_FragColor = clamp(s - (s * Ispec), 0.0, 1.0);
}