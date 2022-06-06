barba.init({
	transitions: [
		{
			name: 'default-transition',
			sync: true,
			leave(data) {
				// return gsap.timeline().to(data.current.container, { opacity: 0, duration: 1.0 });
				const { trigger } = data;
				if (trigger.className === 'student__link' && false) {
					g_selectedImage = trigger.querySelector('img');
					console.log(data);
					let uCorners = g_selectedImage._mesh.material.uniforms.uCorners.value;
					gsap.set(g_settings, { progress: 0 });
					gsap.to(g_settings, { progress: 1, duration: 1, ease: 'power2.out' });
					const tl = gsap
						.timeline()
						.to(data.current.container.querySelector('.students-grid'), {
							opacity: 0,
							duration: 0.5
						})
						.to(uCorners, { x: 1 }, '-=0.5')
						.to(uCorners, { y: 1 }, '-=0.4')
						.to(uCorners, { z: 1 }, '-=0.4')
						.to(uCorners, { w: 1 }, '-=0.4')
						.to(data.current.container, { opacity: 0, duration: 1.0 });
					console.log(tl.duration());
					return tl;
				} else {
					return gsap.to(data.current.container, { opacity: 0, duration: 0.5 });
				}
			},
			enter(data) {
				console.log('enter', data);
				// window.scrollTo(0, 0, { behavior: 'smooth' });
				return gsap
					.timeline()
					.delay(0.2)
					.add(() => {
						window.scrollTo(0, 0);
					})
					.from(data.next.container, { opacity: 0, duration: 0.5 });

				// return gsap.from(data.next.container, { opacity: 0, duration: 0.5, delay: 0.2 });
			}
		}
	]
});
