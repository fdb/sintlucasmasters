import { useEffect, useState } from 'react';

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
				const res = await fetch(`/api/admin/table/${activeTable}?limit=100`);
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

	return (
		<div className="admin-shell">
			<header className="admin-header">
				<div>
					<h1>Admin</h1>
					<p>Data viewer for Sint Lucas Masters.</p>
				</div>
				<div className="admin-actions">
					{user && <span className="admin-user">{user.email}</span>}
					<button type="button" onClick={handleLogout}>
						Log out
					</button>
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

					<div className="admin-table">
						<div className="admin-table-meta">
							<h2>{activeTable.replace('_', ' ')}</h2>
							{tableData && (
								<span>
									Showing {tableData.rows.length} of {tableData.count}
								</span>
							)}
						</div>

						{tableStatus === 'loading' && <p>Loading data…</p>}
						{tableStatus === 'error' && <p className="error-message">Failed to load data.</p>}
						{tableStatus === 'ready' && (!tableData || tableData.rows.length === 0) && (
							<p>No rows found.</p>
						)}

						{tableStatus === 'ready' && tableData && tableData.rows.length > 0 && (
							<div className="table-scroll">
								<table>
									<thead>
										<tr>
											{columns.map((column) => (
												<th key={column}>{column}</th>
											))}
										</tr>
									</thead>
									<tbody>
										{tableData.rows.map((row, rowIndex) => (
											<tr
												key={`${activeTable}-${rowIndex}`}
												className={
													isProjectsTable ? 'row-clickable' : undefined
												}
												onClick={() => {
													if (!isProjectsTable) return;
													const id = row.id;
													if (typeof id === 'string') {
														setSelectedProjectId(id);
													}
												}}
											>
												{columns.map((column) => (
													<td key={column}>{formatCell(row[column])}</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{isProjectsTable && (
						<section className="admin-detail">
							<div className="admin-detail-header">
								<h3>Project details</h3>
								{selectedProjectId && (
									<span>{selectedProjectId}</span>
								)}
							</div>
							{!selectedProjectId && <p>Select a project row to view details.</p>}
							{projectStatus === 'loading' && <p>Loading project…</p>}
							{projectStatus === 'error' && (
								<p className="error-message">Failed to load project.</p>
							)}
							{projectStatus === 'ready' && projectDetail && (
								<div className="detail-grid">
									{Object.entries(projectDetail.project).map(([key, value]) => (
										<div key={key} className="detail-row">
											<div className="detail-key">{key}</div>
											<div className="detail-value">{formatCell(value)}</div>
										</div>
									))}
									{projectDetail.images.length > 0 && (
										<div className="detail-row">
											<div className="detail-key">images</div>
											<div className="detail-value">
												{projectDetail.images.length} image(s)
											</div>
										</div>
									)}
								</div>
							)}
						</section>
					)}
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
