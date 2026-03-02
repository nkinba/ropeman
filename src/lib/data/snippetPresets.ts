export interface SnippetPreset {
	id: string;
	name: string;
	language: string;
	description: string;
	code: string;
}

export const SNIPPET_PRESETS: SnippetPreset[] = [
	{
		id: 'micrograd',
		name: 'micrograd',
		language: 'python',
		description: 'Tiny autograd engine with a neural net',
		code: `class Value:
    def __init__(self, data, _children=(), _op=''):
        self.data = data
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), '*')
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def relu(self):
        out = Value(0 if self.data < 0 else self.data, (self,), 'ReLU')
        def _backward():
            self.grad += (out.data > 0) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        topo = []
        visited = set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)
        build_topo(self)
        self.grad = 1.0
        for v in reversed(topo):
            v._backward()


class Neuron:
    def __init__(self, nin):
        import random
        self.w = [Value(random.uniform(-1, 1)) for _ in range(nin)]
        self.b = Value(0)

    def __call__(self, x):
        act = sum((wi * xi for wi, xi in zip(self.w, x)), self.b)
        return act.relu()

    def parameters(self):
        return self.w + [self.b]


class Layer:
    def __init__(self, nin, nout):
        self.neurons = [Neuron(nin) for _ in range(nout)]

    def __call__(self, x):
        out = [n(x) for n in self.neurons]
        return out[0] if len(out) == 1 else out

    def parameters(self):
        return [p for n in self.neurons for p in n.parameters()]


class MLP:
    def __init__(self, nin, nouts):
        sz = [nin] + nouts
        self.layers = [Layer(sz[i], sz[i+1]) for i in range(len(nouts))]

    def __call__(self, x):
        for layer in self.layers:
            x = layer(x)
        return x

    def parameters(self):
        return [p for layer in self.layers for p in layer.parameters()]
`,
	},
	{
		id: 'express-api',
		name: 'Express API',
		language: 'javascript',
		description: 'Simple REST API with routes and middleware',
		code: `const express = require('express');
const app = express();

app.use(express.json());

const users = new Map();
let nextId = 1;

function authenticate(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = token;
    next();
}

function validateUser(req, res, next) {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email required' });
    }
    next();
}

app.get('/api/users', authenticate, (req, res) => {
    const list = Array.from(users.values());
    res.json({ users: list, total: list.length });
});

app.get('/api/users/:id', authenticate, (req, res) => {
    const user = users.get(Number(req.params.id));
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

app.post('/api/users', authenticate, validateUser, (req, res) => {
    const user = { id: nextId++, ...req.body, createdAt: new Date() };
    users.set(user.id, user);
    res.status(201).json(user);
});

app.put('/api/users/:id', authenticate, validateUser, (req, res) => {
    const id = Number(req.params.id);
    if (!users.has(id)) {
        return res.status(404).json({ error: 'User not found' });
    }
    const updated = { ...users.get(id), ...req.body, updatedAt: new Date() };
    users.set(id, updated);
    res.json(updated);
});

app.delete('/api/users/:id', authenticate, (req, res) => {
    const id = Number(req.params.id);
    if (!users.delete(id)) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
`,
	},
	{
		id: 'ts-utils',
		name: 'TypeScript Utils',
		language: 'typescript',
		description: 'Utility functions with generics and types',
		code: `interface Result<T, E = Error> {
    ok: boolean;
    value?: T;
    error?: E;
}

function ok<T>(value: T): Result<T> {
    return { ok: true, value };
}

function err<E = Error>(error: E): Result<never, E> {
    return { ok: false, error };
}

type Predicate<T> = (item: T) => boolean;

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
        const key = keyFn(item);
        (groups[key] ??= []).push(item);
    }
    return groups;
}

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
    return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}

class LRUCache<K, V> {
    private cache = new Map<K, V>();
    constructor(private maxSize: number) {}

    get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) this.cache.delete(key);
        if (this.cache.size >= this.maxSize) {
            const oldest = this.cache.keys().next().value;
            if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.cache.set(key, value);
    }

    get size(): number {
        return this.cache.size;
    }
}

async function retry<T>(
    fn: () => Promise<T>,
    attempts: number = 3,
    delayMs: number = 1000
): Promise<T> {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            if (i === attempts - 1) throw e;
            await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        }
    }
    throw new Error('Unreachable');
}

export { ok, err, groupBy, chunk, debounce, pipe, LRUCache, retry };
export type { Result, Predicate };
`,
	},
];

export const LANGUAGE_COLORS: Record<string, string> = {
	python: '#3572A5',
	javascript: '#f1e05a',
	typescript: '#3178c6',
	java: '#b07219',
	go: '#00ADD8',
	rust: '#dea584',
	c: '#555555',
	cpp: '#555555',
};

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
	python: '.py',
	javascript: '.js',
	typescript: '.ts',
	java: '.java',
	go: '.go',
	rust: '.rs',
	c: '.c',
	cpp: '.cpp',
};
