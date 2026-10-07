/**
 * Clyvo - configuracao do PM2 (para VPS comum: Hostinger, Contabo, DigitalOcean).
 * O PM2 mantem a API no ar: reinicia se cair e sobe junto com o servidor.
 *
 * Como usar, dentro da pasta "backend" do servidor:
 *   npm ci --omit=dev && npm run build
 *   pm2 start ../deploy/ecosystem.config.js
 *   pm2 save && pm2 startup     <- o segundo comando imprime uma linha
 *                                  para voce copiar e executar
 *
 * Ver o que esta acontecendo:
 *   pm2 logs clyvo-api
 *   pm2 restart clyvo-api
 */
module.exports = {
  apps: [
    {
      name: 'clyvo-api',
      cwd: '../backend',
      script: 'dist/server.js',
      // "cluster" com 2 instancias aproveita 2 nucleos. Em VPS de 1 nucleo,
      // troque para instances: 1.
      exec_mode: 'cluster',
      instances: 2,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      // Reinicio automatico, mas sem entrar em loop infinito.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      error_file: '../deploy/logs/clyvo-api-erro.log',
      out_file: '../deploy/logs/clyvo-api.log',
      merge_logs: true,
      time: true,
    },
  ],
};
