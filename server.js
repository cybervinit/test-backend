import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: true }));
}).listen(port, () => console.log(`Listening on http://localhost:${port}`));
