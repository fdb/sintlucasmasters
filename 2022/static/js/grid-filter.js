function setupGridFilter() {
	const grid = document.querySelector('.students-grid');
	if (!grid) return;
	animateCSSGrid.wrapGrid(grid, { duration: 300 });

	document.querySelectorAll('button.filter').forEach((button) => {
		button.addEventListener('click', (e) => {
			const filterKey = button.dataset.filterKey;
			const filterValue = button.dataset.value;
			console.log(filterKey, filterValue);
			document.querySelectorAll('.students-grid .student').forEach((student) => {
				if (filterValue === '*') {
					student.classList.remove('grid--hidden');
					student.style.display = 'block';
				} else {
					if (student.dataset[filterKey] === filterValue) {
						student.classList.remove('grid--hidden');
					} else {
						student.classList.add('grid--hidden');
					}

					// student.style.display = student.dataset[filterKey] === filterValue ? 'block' : 'none';
				}
			});
		});
	});
}

setupGridFilter();
