const http = require('node:http');

const server = http.createServer((req, res) => {
  const targetPort = req.url?.startsWith('/api') ? 3333 : 8082;

  const proxy = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  }, upstream => {
    res.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(res);
  });

  proxy.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Servico local indisponivel');
    }
  });

  req.pipe(proxy);
});

server.listen(8081, '0.0.0.0', () => {
  console.log('Clyvo Web: proxy ativo na porta 8081');
});
