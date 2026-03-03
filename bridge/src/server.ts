#!/usr/bin/env node

import { WebSocketServer, WebSocket } from 'ws';

const DEFAULT_PORT = 9800;

interface BridgeMessage {
	id?: number;
	type: 'analyze' | 'chat' | 'status' | 'ping';
	payload?: unknown;
	message?: string;
}

interface BridgeResponse {
	id?: number;
	type: string;
	result?: string;
	error?: string;
}

function parsePort(args: string[]): number {
	const portIdx = args.indexOf('--port');
	if (portIdx !== -1 && args[portIdx + 1]) {
		const p = parseInt(args[portIdx + 1], 10);
		if (!isNaN(p) && p > 0 && p < 65536) return p;
	}
	return DEFAULT_PORT;
}

function log(msg: string): void {
	const ts = new Date().toISOString().slice(11, 19);
	console.log(`[${ts}] ${msg}`);
}

function startServer(port: number): void {
	const wss = new WebSocketServer({ port });
	const clients = new Set<WebSocket>();

	log(`CodeViz Bridge server starting on ws://localhost:${port}`);

	wss.on('connection', (ws, req) => {
		const addr = req.socket.remoteAddress ?? 'unknown';
		clients.add(ws);
		log(`Client connected from ${addr} (${clients.size} total)`);

		ws.on('message', (raw) => {
			let msg: BridgeMessage;
			try {
				msg = JSON.parse(raw.toString());
			} catch {
				ws.send(JSON.stringify({ error: 'Invalid JSON' }));
				return;
			}

			log(`Received [${msg.type}] id=${msg.id ?? '-'}`);

			const response: BridgeResponse = { id: msg.id, type: msg.type };

			switch (msg.type) {
				case 'ping':
					response.result = 'pong';
					break;
				case 'status':
					response.result = JSON.stringify({
						clients: clients.size,
						uptime: process.uptime()
					});
					break;
				case 'analyze':
				case 'chat':
					// Relay to other connected clients (future: route to AI provider)
					response.result = `Bridge received ${msg.type} message`;
					break;
				default:
					response.error = `Unknown message type: ${msg.type}`;
			}

			ws.send(JSON.stringify(response));
		});

		ws.on('close', () => {
			clients.delete(ws);
			log(`Client disconnected (${clients.size} remaining)`);
		});

		ws.on('error', (err) => {
			log(`Client error: ${err.message}`);
			clients.delete(ws);
		});

		// Send welcome
		ws.send(JSON.stringify({ type: 'status', result: 'connected' }));
	});

	wss.on('error', (err) => {
		if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
			console.error(`Port ${port} is already in use. Try a different port with --port <number>`);
			process.exit(1);
		}
		console.error('Server error:', err.message);
	});

	function shutdown() {
		log('Shutting down...');
		for (const client of clients) {
			client.close(1000, 'Server shutting down');
		}
		wss.close(() => {
			log('Server stopped');
			process.exit(0);
		});
		// Force exit after 3s
		setTimeout(() => process.exit(0), 3000);
	}

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	log(`Bridge server ready on ws://localhost:${port}`);
}

const port = parsePort(process.argv.slice(2));
startServer(port);
