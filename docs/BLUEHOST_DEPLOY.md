# Bluehost Deployment (pghwarriorhockey.us)

This project is a Next.js app and needs a Node.js runtime.

## 1) Confirm hosting type first
- If your Bluehost plan is **shared WordPress hosting only**, you typically cannot run a persistent Next.js server process directly.
- If you have **Bluehost VPS or Dedicated** with SSH/root, follow this guide and deploy directly.

## 2) Server prerequisites (VPS/Dedicated)
```bash
sudo apt update
sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 3) App install
```bash
sudo mkdir -p /var/www/pgh-warriors
sudo chown -R $USER:$USER /var/www/pgh-warriors
cd /var/www/pgh-warriors
# copy project files here (git clone, rsync, or sftp)
cp .env.example .env
# edit .env with real secrets
npm ci
npm run build
npx pm2 start ecosystem.config.cjs
npx pm2 save
pm2 status
```

## 4) Nginx reverse proxy
Create `/etc/nginx/sites-available/pgh-warriors`:
```nginx
server {
    listen 80;
    server_name pghwarriorhockey.us www.pghwarriorhockey.us;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/pgh-warriors /etc/nginx/sites-enabled/pgh-warriors
sudo nginx -t
sudo systemctl reload nginx
```

## 5) SSL (Let’s Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pghwarriorhockey.us -d www.pghwarriorhockey.us
```

## 6) If WordPress is already on root domain
Use one of these:
- Keep WordPress on `pghwarriorhockey.us`, run this app on `hq.pghwarriorhockey.us`
- Or keep this app on root and move WordPress to `news.pghwarriorhockey.us`

## 7) Google Workspace email integration
Set in `.env`:
- `EMAIL_FROM`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=ops@pghwarriorhockey.us`
- `SMTP_PASS=<Google app password>`

## 8) Zero-downtime updates
```bash
cd /var/www/pgh-warriors
./scripts/deploy-bluehost.sh
```

## 9) Shared hosting fallback
If you are on shared hosting and cannot run Node:
- Host this app on Vercel/Railway/Render
- Point Bluehost DNS (`A`/`CNAME`) to that app
- Keep WordPress as needed on a subdomain
