import { useEffect, useState, useRef } from 'react';
import { Sun, Moon, LogOut, Search } from 'lucide-react';

type AuthUser = {
	id: string;
	email: string;
	name: string | null;
	isAdmin: boolean;
};

type AuthResponse =
	| { authenticated: true; user: AuthUser }
	| { authenticated: false };

type TableResponse = {
	table: string;
	limit: number;
	count: number;
	rows: Array<Record<string, unknown>>;
};

type ProjectDetailResponse = {
	project: Record<string, unknown>;
	images: Array<Record<string, unknown>>;
};

export default function App() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
	const [tables, setTables] = useState<string[]>([]);
	const [activeTable, setActiveTable] = useState<string>('');
	const [tableData, setTableData] = useState<TableResponse | null>(null);
	const [tableStatus, setTableStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
	const [projectDetail, setProjectDetail] = useState<ProjectDetailResponse | null>(null);
	const [projectStatus, setProjectStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

	// Filters
	const [selectedYear, setSelectedYear] = useState<string>('');
	const [selectedContext, setSelectedContext] = useState<string>('');
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [searchExpanded, setSearchExpanded] = useState<boolean>(false);

	// Dark mode
	const [darkMode, setDarkMode] = useState<boolean>(() => {
		const stored = localStorage.getItem('admin-dark-mode');
		if (stored !== null) return stored === 'true';
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	// User menu
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const userMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
		localStorage.setItem('admin-dark-mode', String(darkMode));
	}, [darkMode]);

	// Close user menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
				setUserMenuOpen(false);
			}
		};
		if (userMenuOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [userMenuOpen]);

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch('/api/auth/me');
				if (!res.ok) {
					setStatus('error');
					return;
				}
				const data = (await res.json()) as AuthResponse;
				if (data.authenticated) {
					setUser(data.user);
					const tablesRes = await fetch('/api/admin/tables');
					if (tablesRes.ok) {
						const tablesData = (await tablesRes.json()) as { tables: string[] };
						setTables(tablesData.tables);
						setActiveTable((current) => current || tablesData.tables[0] || '');
					}
				}
				setStatus('ready');
			} catch {
				setStatus('error');
			}
		};

		load();
	}, []);

	useEffect(() => {
		if (!activeTable) return;

		const loadTable = async () => {
			setTableStatus('loading');
			try {
				const res = await fetch(`/api/admin/table/${activeTable}?limit=1000`);
				if (!res.ok) {
					setTableStatus('error');
					return;
				}
				const data = (await res.json()) as TableResponse;
				setTableData(data);
				setTableStatus('ready');
				setSelectedProjectId(null);
				setProjectDetail(null);
				setProjectStatus('idle');
			} catch {
				setTableStatus('error');
			}
		};

		loadTable();
	}, [activeTable]);

	useEffect(() => {
		if (!selectedProjectId) return;

		const loadProject = async () => {
			setProjectStatus('loading');
			try {
				const res = await fetch(`/api/admin/projects/${selectedProjectId}`);
				if (!res.ok) {
					setProjectStatus('error');
					return;
				}
				const data = (await res.json()) as ProjectDetailResponse;
				setProjectDetail(data);
				setProjectStatus('ready');
			} catch {
				setProjectStatus('error');
			}
		};

		loadProject();
	}, [selectedProjectId]);

	const handleLogout = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/auth/login';
	};

	const columns = tableData?.rows[0] ? Object.keys(tableData.rows[0]) : [];
	const isProjectsTable = activeTable === 'projects';

	// Extract unique years and contexts for filters
	const allYears = isProjectsTable && tableData
		? [...new Set(tableData.rows.map((r) => String(r.academic_year || '')).filter(Boolean))].sort().reverse()
		: [];
	const allContexts = isProjectsTable && tableData
		? [...new Set(tableData.rows.map((r) => String(r.context || '')).filter(Boolean))].sort()
		: [];

	// Set default year to latest when data loads
	useEffect(() => {
		if (isProjectsTable && allYears.length > 0 && !selectedYear) {
			setSelectedYear(allYears[0]);
		}
	}, [isProjectsTable, allYears.length]);

	// Reset filters when switching tables
	useEffect(() => {
		setSelectedYear('');
		setSelectedContext('');
		setSearchQuery('');
		setSearchExpanded(false);
	}, [activeTable]);

	// Filter rows
	const filteredRows = isProjectsTable && tableData
		? tableData.rows.filter((row) => {
				const yearMatch = !selectedYear || String(row.academic_year) === selectedYear;
				const contextMatch = !selectedContext || String(row.context) === selectedContext;
				const searchLower = searchQuery.toLowerCase();
				const searchMatch =
					!searchQuery ||
					String(row.student_name || '').toLowerCase().includes(searchLower) ||
					String(row.project_title || '').toLowerCase().includes(searchLower);
				return yearMatch && contextMatch && searchMatch;
			})
		: tableData?.rows || [];

	// For the compact table view, show only key columns
	const displayColumns = isProjectsTable
		? columns.filter((col) => ['student_name', 'project_title', 'context'].includes(col))
		: columns.slice(0, 4);

	return (
		<div className="admin-shell">
			<header className="admin-header">
				<div>
					<h1>Admin</h1>
					<p>Data viewer for Sint Lucas Masters.</p>
				</div>
				<div className="admin-actions">
					<button
						type="button"
						className="theme-toggle"
						onClick={() => setDarkMode(!darkMode)}
						title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
					>
						{darkMode ? <Sun size={16} /> : <Moon size={16} />}
					</button>
					{user && (
						<div className="user-menu" ref={userMenuRef}>
							<button
								type="button"
								className="user-avatar"
								onClick={() => setUserMenuOpen(!userMenuOpen)}
								title={user.email}
							>
								{user.email.charAt(0).toUpperCase()}
							</button>
							{userMenuOpen && (
								<div className="user-dropdown">
									<div className="user-dropdown-email">{user.email}</div>
									<button type="button" onClick={handleLogout}>
										<LogOut size={14} />
										Log out
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</header>

			{status === 'loading' && <p>Loading your session…</p>}
			{status === 'error' && <p className="error-message">Unable to load your session.</p>}

			{status === 'ready' && tables.length > 0 && (
				<div className="admin-panel">
					<nav className="admin-tabs">
						{tables.map((table) => (
							<button
								key={table}
								type="button"
								className={table === activeTable ? 'active' : ''}
								onClick={() => setActiveTable(table)}
							>
								{table.replace('_', ' ')}
							</button>
						))}
					</nav>

					<div className="admin-split">
						{/* Left: Table list */}
						<div className="admin-list">
							<div className="admin-list-header">
								<h2>{activeTable.replace('_', ' ')}</h2>
								{isProjectsTable && tableData && (
									<div className="admin-filters">
										<select
											value={selectedYear}
											onChange={(e) => setSelectedYear(e.target.value)}
											className="filter-select"
										>
											<option value="">All years</option>
											{allYears.map((year) => (
												<option key={year} value={year}>
													{year}
												</option>
											))}
										</select>
										<select
											value={selectedContext}
											onChange={(e) => setSelectedContext(e.target.value)}
											className="filter-select"
										>
											<option value="">All contexts</option>
											{allContexts.map((ctx) => (
												<option key={ctx} value={ctx}>
													{ctx.replace(' Context', '')}
												</option>
											))}
										</select>
										<div className={`search-container ${searchExpanded ? 'expanded' : ''}`}>
											{searchExpanded ? (
												<input
													type="text"
													value={searchQuery}
													onChange={(e) => setSearchQuery(e.target.value)}
													placeholder="Search..."
													className="search-input"
													autoFocus
													onBlur={() => {
														if (!searchQuery) setSearchExpanded(false);
													}}
												/>
											) : (
												<button
													type="button"
													className="search-toggle"
													onClick={() => setSearchExpanded(true)}
													title="Search"
												>
													<Search size={14} />
												</button>
											)}
										</div>
										<span className="filter-count">{filteredRows.length}</span>
									</div>
								)}
							</div>

							{tableStatus === 'loading' && <p className="admin-list-message">Loading data…</p>}
							{tableStatus === 'error' && <p className="admin-list-message error-message">Failed to load data.</p>}
							{tableStatus === 'ready' && (!tableData || tableData.rows.length === 0) && (
								<p className="admin-list-message">No rows found.</p>
							)}

							{tableStatus === 'ready' && tableData && filteredRows.length > 0 && (
								<div className="admin-list-scroll">
									<table>
										<thead>
											<tr>
												{displayColumns.map((column) => (
													<th key={column}>{column.replace('_', ' ')}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{filteredRows.map((row, rowIndex) => {
												const rowId = typeof row.id === 'string' ? row.id : null;
												const isSelected = isProjectsTable && rowId === selectedProjectId;
												return (
													<tr
														key={`${activeTable}-${rowIndex}`}
														className={`${isProjectsTable ? 'row-clickable' : ''} ${isSelected ? 'row-selected' : ''}`}
														onClick={() => {
															if (!isProjectsTable || !rowId) return;
															setSelectedProjectId(rowId);
														}}
													>
														{displayColumns.map((column) => (
															<td key={column}>{formatCell(row[column])}</td>
														))}
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
							{tableStatus === 'ready' && tableData && tableData.rows.length > 0 && filteredRows.length === 0 && (
								<p className="admin-list-message">No matches found.</p>
							)}
						</div>

						{/* Right: Detail panel */}
						<div className="admin-detail-panel">
							{!isProjectsTable && (
								<div className="admin-detail-empty">
									<p>Select a row to view details</p>
								</div>
							)}

							{isProjectsTable && !selectedProjectId && (
								<div className="admin-detail-empty">
									<span className="detail-icon">←</span>
									<p>Select a project from the list</p>
								</div>
							)}

							{isProjectsTable && projectStatus === 'loading' && (
								<div className="admin-detail-empty">
									<p>Loading project…</p>
								</div>
							)}

							{isProjectsTable && projectStatus === 'error' && (
								<div className="admin-detail-empty">
									<p className="error-message">Failed to load project.</p>
								</div>
							)}

							{isProjectsTable && projectStatus === 'ready' && projectDetail && (
								<div className="admin-detail-content">
									<div className="admin-detail-header">
										<h3>{String(projectDetail.project.student_name || 'Untitled')}</h3>
										<span className="detail-id">{selectedProjectId}</span>
									</div>

									<div className="detail-grid">
										{Object.entries(projectDetail.project)
											.filter(([key]) => key !== 'id')
											.map(([key, value]) => (
												<div key={key} className="detail-row">
													<div className="detail-key">{key.replace('_', ' ')}</div>
													<div className="detail-value">{formatCell(value)}</div>
												</div>
											))}

										{projectDetail.images.length > 0 && (
											<div className="detail-row">
												<div className="detail-key">images</div>
												<div className="detail-value detail-images">
													{projectDetail.images.map((img, idx) => (
														<div key={idx} className="detail-image-item">
															{formatCell(img)}
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function formatCell(value: unknown) {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	return JSON.stringify(value);
}
