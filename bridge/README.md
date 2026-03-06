# @ropeman/bridge

WebSocket relay server for Ropeman AI bridge connections.

## Usage

```bash
npx @ropeman/bridge
npx @ropeman/bridge --port 9800
```

## Protocol

Messages use JSON format with `{ type, payload }` structure.

### Message Types

| Type      | Description                   |
| --------- | ----------------------------- |
| `ping`    | Health check (returns `pong`) |
| `status`  | Server status info            |
| `analyze` | Code analysis request         |
| `chat`    | Chat/conversation message     |

### Request Format

```json
{ "id": 1, "type": "chat", "message": "explain this code" }
```

### Response Format

```json
{ "id": 1, "type": "chat", "result": "..." }
```

## Development

```bash
cd bridge
npm install
npm run build
npm start
```
