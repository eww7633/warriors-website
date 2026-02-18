module.exports = {
  apps: [
    {
      name: "pgh-warriors-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/pgh-warriors",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M"
    }
  ]
};
