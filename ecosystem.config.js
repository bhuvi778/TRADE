module.exports = {
  apps: [
    {
      name: 'growex-capital-bot',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
      restart_delay: 5000,
      max_restarts: 10,
      exp_backoff_restart_delay: 100
    }
  ]
};
