# Server API

This server provides REST endpoints for the frontend and Telegram bots.

Start:

```bash
cd server
npm install
npm start
```

Example curl commands:

- Create property

```bash
curl -X POST http://localhost:3400/api/properties -H "Content-Type: application/json" -d '{"title":"House A","price":"100000","location":"City"}'
```

- List properties

```bash
curl http://localhost:3400/api/properties
```

- Mark sold

```bash
curl -X POST http://localhost:3400/api/properties/{id}/mark-sold
```

- Add video

```bash
curl -X POST http://localhost:3400/api/videos -H "Content-Type: application/json" -d '{"url":"https://...","title":"Walkthrough"}'
```

- Add subscriber

```bash
curl -X POST http://localhost:3400/api/newsletters/subscribers -H "Content-Type: application/json" -d '{"email":"user@example.com","name":"User"}'
```

- Send newsletter

```bash
curl -X POST http://localhost:3400/api/newsletters/send/{newsletterId}
```
