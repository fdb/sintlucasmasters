const HEADER_OFFSET = 64;

let g_width,
	g_height,
	g_scene,
	g_camera,
	g_renderer,
	g_settings,
	g_gui,
	g_imageMeshes,
	g_selectedImage;

g_settings = {
	progress: 0
};

g_imageMeshes = [];

const vertexShader = `
uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec2 uQuadSize;
uniform vec4 uCorners;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vSize;

float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}

void main() {
    vUv = uv;
    vec4 thumbState = modelMatrix * vec4(position, 1.0);
    vec4 fullState = vec4(position, 1.0);
    fullState.x *= uResolution.x;
    fullState.y *= uResolution.y * 0.8 + 64.0;
	fullState.y += uResolution.y * 0.1 * uProgress;
	fullState.z += uCorners.x;
	float cornersProgress = mix(
        mix(uCorners.z,uCorners.w,uv.x),
        mix(uCorners.x,uCorners.y,uv.x),
        uv.y
    );
	// fullState.x *= 2.0;
	// fullState.x *= 2.0;
    vec4 finalState = mix(thumbState, fullState, cornersProgress);
	// finalState.x += uProgress * noise(vec2(position.x, position.y) * 2.0) * 100.0;
	// finalState.y += uProgress * noise(vec2(position.x, position.y) * 2.0) * 100.0;
	vSize = mix(uQuadSize, uResolution, cornersProgress);
    gl_Position = projectionMatrix * viewMatrix * finalState;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uProgress;
uniform float uOpacity;
uniform sampler2D uTexture;
uniform vec2 uQuadSize;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vSize;

vec2 getUv() {
	vec2 tempUv = vUv - vec2(0.5);
	float vAspect = vSize.x / vSize.y;
	float tAspect = uQuadSize.x / uQuadSize.y;
	if (vAspect > tAspect) {
		tempUv *= vec2(vAspect / tAspect, 1.0);
	} else {
		tempUv *= vec2(1.0, tAspect / vAspect);
	}
	tempUv += vec2(0.5);
	return tempUv;
}

void main() {
	vec2 uv = getUv();
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		// gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
		discard;
	} else if (uOpacity > 0.0) {
		vec4 image = texture2D(uTexture, uv);
		gl_FragColor = mix(image, vec4(0.96, 0.96, 0.96, 1.0), 1.0 - uOpacity);
	} else {
		discard;
	}
}
`;

function setup() {
	g_container = document.querySelector('.webgl-container');
	g_width = g_container.offsetWidth;
	g_height = g_container.offsetHeight;
	console.log(g_width, g_height);
	g_scene = new THREE.Scene();
	g_camera = new THREE.PerspectiveCamera(75, g_width / g_height, 0.1, 1000);
	g_camera.position.z = 30;
	g_renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
	g_renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	g_renderer.setSize(g_width, g_height);

	g_container.appendChild(g_renderer.domElement);

	if (document.location.hash === '#debug') {
		g_gui = new lil.GUI();
		g_gui.add(g_settings, 'progress', 0, 1, 0.001);
	}

	syncImages();
	// captureClickEvents();
	onResize();
	animate();
}

function createShaderMaterial(imageUrl) {
	const uniforms = {
		uTime: { value: 1.0 },
		uProgress: { value: 0.0 },
		uCorners: { value: new THREE.Vector4(0, 0, 0, 0) },
		uTexture: { value: new THREE.TextureLoader().load(imageUrl) },
		uResolution: { value: new THREE.Vector2(g_width, g_height) },
		uQuadSize: { value: new THREE.Vector2(300, 300) }, // Size of the plane
		uOpacity: { value: 1.0 }
	};
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader,
		fragmentShader,
		wireframe: false
	});
	return material;
}

function syncImages() {
	// Get all project images on the page.
	const images = document.querySelectorAll('.students-grid img');
	for (const image of images) {
		const bounds = image.getBoundingClientRect();
		image._x = bounds.left + bounds.width / 2 - g_width / 2;
		image._y = -(bounds.top + bounds.height / 2) + g_height / 2 - window.scrollY + HEADER_OFFSET;

		if (!image._mesh) {
			const geometry = new THREE.PlaneBufferGeometry(1, 1, 30, 30);
			const material = createShaderMaterial(image.src);
			const plane = new THREE.Mesh(geometry, material);
			plane.scale.set(300, 300, 1);
			g_scene.add(plane);
			image._mesh = plane;
			plane._image = image;
			g_imageMeshes.push(plane);
		}

		image._mesh.position.set(image._x, image._y + window.scrollY, 0);
		image._mesh.material.uniforms.uResolution.value = new THREE.Vector2(g_width, g_height);
	}
}

function captureClickEvents() {
	// const links = document.querySelectorAll('.students-grid a');
	// for (const link of links) {
	// 	link.addEventListener('click', function (e) {
	// 		// e.preventDefault();
	// 		g_selectedImage = this.querySelector('img');
	// 		// g_settings.progress = progress;
	// 		// let uCorners = g_selectedImage._mesh.material.uniforms.uCorners.value;
	// 		// gsap.set(g_settings, { progress: 0 });
	// 		// gsap.to(g_settings, { progress: 1, duration: 1, ease: 'power2.out' });
	// 		// gsap
	// 		// 	.timeline()
	// 		// 	.to(uCorners, { x: 1 })
	// 		// 	.to(uCorners, { y: 1 }, '-=0.4')
	// 		// 	.to(uCorners, { z: 1 }, '-=0.4')
	// 		// 	.to(uCorners, { w: 1 }, '-=0.4');
	// 	});
	// }
	barba.init({
		transitions: [
			{
				name: 'default-transition',
				leave(data) {
					// return gsap.timeline().to(data.current.container, { opacity: 0, duration: 1.0 });
					const { trigger } = data;
					g_selectedImage = trigger.querySelector('img');
					console.log(data);
					let uCorners = g_selectedImage._mesh.material.uniforms.uCorners.value;
					gsap.set(g_settings, { progress: 0 });
					gsap
						.timeline()
						.to(uCorners, { x: 1 })
						.to(uCorners, { y: 1 }, '-=0.4')
						.to(uCorners, { z: 1 }, '-=0.4')
						.to(uCorners, { w: 1 }, '-=0.4');
					return gsap.to(g_settings, { progress: 1, duration: 1, ease: 'power2.out' });
					// create your stunning leave animation here
				},
				enter() {
					return gsap.timeline().from(data.next.container, { opacity: 0, duration: 1.0 });
					// create your amazing enter animation here
				}
			}
		]
	});
}

function onScroll() {
	g_imageMeshes.forEach(function (mesh) {
		mesh.position.set(mesh._image._x, mesh._image._y + window.scrollY, 0);
	});
}

function animate() {
	requestAnimationFrame(animate);
	for (const mesh of g_imageMeshes) {
		mesh.material.uniforms.uOpacity.value = 1.0 - g_settings.progress;
	}
	if (g_selectedImage && g_selectedImage._mesh) {
		g_selectedImage._mesh.material.uniforms.uProgress.value = g_settings.progress;
		g_selectedImage._mesh.material.uniforms.uOpacity.value = 1.0;
	}
	g_renderer.render(g_scene, g_camera);
}

function onResize() {
	g_width = g_container.offsetWidth;
	g_height = g_container.offsetHeight;
	g_renderer.setSize(g_width, g_height);

	// Set up camera so the THREE dimensions match the screen.
	g_camera.aspect = g_width / g_height;
	g_camera.fov = (Math.atan(g_height / 2 / g_camera.position.z) * 2 * 180) / Math.PI;
	g_camera.updateProjectionMatrix();

	syncImages();
}

setup();
// animate();
window.addEventListener('resize', onResize);
window.addEventListener('scroll', onScroll);
