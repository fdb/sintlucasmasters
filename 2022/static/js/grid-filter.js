let selectedContext = '*';
let selectedTags = new Set();

function filterStudents() {
	const tagList = Array.from(selectedTags);
	document.querySelectorAll('.students-grid .student').forEach((student) => {
		const inContext = selectedContext === '*' || student.dataset.context === selectedContext;
		const studentTags = new Set(student.dataset.tags.split(','));
		const intersectedTags = tagList.filter((t) => studentTags.has(t));
		if (student.querySelector('.student__name').textContent.includes('Eva')) {
			console.log(student, selectedTags, intersectedTags);
		}
		const inTags = selectedTags.size === 0 || selectedTags.size === intersectedTags.length;

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
				if (filterValue === '*') {
					selectedTags.clear();
					document.querySelectorAll('button.filter[data-key=tags]').forEach((b) => b.classList.remove('active'));
					button.classList.add('active');
				} else {
					document.querySelector('button.filter[data-key=tags][data-value="*"]').classList.remove('active');
					if (selectedTags.has(filterValue)) {
						selectedTags.delete(filterValue);
						button.classList.remove('active');
					} else {
						selectedTags.add(filterValue);
						button.classList.add('active');
					}
				}
			}
			console.log(selectedContext, selectedTags);
			filterStudents();
		});
	});
}

setupGridFilter();
