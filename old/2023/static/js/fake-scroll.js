window.addEventListener('scroll', function () {
	const scrollPercentage =
		(document.documentElement.scrollTop + document.body.scrollTop) /
		(document.documentElement.scrollHeight - document.documentElement.clientHeight);
	console.log('scroll', scrollPercentage);

	document.querySelector('main').style.transform = `translate(0, ${-scrollPercentage * 1000}vh)`;
});
