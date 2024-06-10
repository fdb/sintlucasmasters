module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy('2024/static');

	eleventyConfig.addCollection('digitalContext', (collectionApi) => {
		return collectionApi.getAll().filter((item) => item.data.context === 'Digital Context');
	});

	eleventyConfig.addCollection('autonomousContext', (collectionApi) => {
		return collectionApi.getAll().filter((item) => item.data.context === 'Autonomous Context');
	});

	eleventyConfig.addCollection('appliedContext', (collectionApi) => {
		return collectionApi.getAll().filter((item) => item.data.context === 'Applied Context');
	});

	eleventyConfig.addCollection('sociopoliticalContext', (collectionApi) => {
		return collectionApi.getAll().filter((item) => item.data.context === 'Socio-Political Context');
	});

	eleventyConfig.addCollection('students', (collectionApi) => {
		return collectionApi.getAll().filter((item) => item.data.student_name);
	});
};
