import { Hono } from 'hono';

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
	const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM projects').first();
	return c.text(`Sint Lucas Masters - ${result?.count || 0} projects in database`);
});

export default app;
