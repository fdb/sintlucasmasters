let selectedContext = '*';
let selectedTag = '*';

function filterStudents() {
	document.querySelectorAll('.students-grid .student').forEach((student) => {
		const inContext = selectedContext === '*' || student.dataset.context === selectedContext;
		const studentTags = student.dataset.tags.length === 0 ? [] : student.dataset.tags.split(',');
		const inTags = selectedTag === '*' || studentTags.includes(selectedTag);
		if (inContext && inTags) {
			student.classList.remove('grid--hidden');
			student.style.display = 'block';
		} else {
			student.classList.add('grid--hidden');
		}
	});
}

function setupGridFilter() {
	const grid = document.querySelector('.students-grid');
	if (!grid) return;
	animateCSSGrid.wrapGrid(grid, { duration: 300 });

	document.querySelectorAll('button.filter').forEach((button) => {
		button.addEventListener('click', (e) => {
			const filterKey = button.dataset.key;
			const filterValue = button.dataset.value;
			if (filterKey === 'context') {
				selectedContext = filterValue;
				document.querySelectorAll('button.filter[data-key=context]').forEach((b) => b.classList.remove('active'));
				button.classList.add('active');
			} else if (filterKey === 'tags') {
				selectedTag = filterValue;
				document.querySelectorAll('button.filter[data-key=tags]').forEach((b) => b.classList.remove('active'));
				button.classList.add('active');
			}
			filterStudents();
		});
	});
}

setupGridFilter();
