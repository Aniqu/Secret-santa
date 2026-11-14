// PM2: `npm install && npm run build`, then `pm2 start ecosystem.config.cjs`
module.exports = {
  apps: [{
    name: 'secret-santa',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // ADMIN_PASSWORD: 'pakeiskite-mane',
    },
  }],
};
