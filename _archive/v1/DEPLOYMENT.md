# Secret Santa App - Deployment Guide

## Quick Deploy Options

### Option 1: DigitalOcean App Platform (Recommended - Easiest)

**Cost:** $5/month
**Difficulty:** ⭐ Easy
**Time:** 10 minutes

#### Steps:

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/secret-santa.git
   git push -u origin main
   ```

2. **Create App on DigitalOcean:**
   - Visit: https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Select "GitHub" and authorize
   - Choose your repository
   - DigitalOcean auto-detects Node.js

3. **Configure App:**
   - **Name:** secret-santa
   - **Build Command:** `npm install`
   - **Run Command:** `npm start`
   - **HTTP Port:** 3000
   - **Plan:** Basic ($5/month)

4. **Deploy:**
   - Click "Next" → "Launch Basic App"
   - Wait 3-5 minutes for deployment
   - Access your app at: `https://your-app-name.ondigitalocean.app`

---

### Option 2: DigitalOcean Droplet (Full Control)

**Cost:** $6/month
**Difficulty:** ⭐⭐⭐ Intermediate
**Time:** 30 minutes

#### Step 1: Create Droplet

1. Go to DigitalOcean Dashboard
2. Click "Create" → "Droplets"
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($6/month - 1GB RAM)
   - **Datacenter:** Closest to your users
   - **Authentication:** SSH Key (recommended) or Password
4. Click "Create Droplet"
5. Note your droplet's IP address

#### Step 2: Connect to Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

#### Step 3: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node -v
npm -v

# Install Git
sudo apt-get install -y git
```

#### Step 4: Upload Your Project

**Method A: Using Git (Recommended)**
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/secret-santa.git
cd secret-santa
npm install --production
```

**Method B: Using SCP (from your local machine)**
```bash
# Run this from your local machine
scp -r "C:\Users\litak\Desktop\christmas santa" root@YOUR_DROPLET_IP:/var/www/secret-santa
```

Then on the server:
```bash
cd /var/www/secret-santa
npm install --production
```

#### Step 5: Install and Configure PM2

PM2 keeps your app running even after server restarts.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app
cd /var/www/secret-santa
pm2 start server.js --name secret-santa

# Or use ecosystem file:
pm2 start ecosystem.config.js

# Setup auto-restart on reboot
pm2 startup
# Copy and run the command it outputs
pm2 save

# Check status
pm2 status
pm2 logs secret-santa
```

#### Step 6: Configure Firewall

```bash
# Enable firewall
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw enable
sudo ufw status
```

#### Step 7: Access Your App

Visit: `http://YOUR_DROPLET_IP:3000`

---

### Option 3: Add Domain Name & SSL (Optional)

#### Install Nginx as Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/secret-santa
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
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
sudo ln -s /etc/nginx/sites-available/secret-santa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Update firewall
sudo ufw allow 'Nginx Full'
sudo ufw delete allow 3000
```

#### Add SSL with Let's Encrypt (Free HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
# Test renewal:
sudo certbot renew --dry-run
```

Now access: `https://your-domain.com`

---

## Useful Commands

### PM2 Management
```bash
pm2 list                    # Show all running apps
pm2 logs secret-santa       # View logs
pm2 restart secret-santa    # Restart app
pm2 stop secret-santa       # Stop app
pm2 delete secret-santa     # Remove app
pm2 monit                   # Monitor resources
```

### Update Your App
```bash
cd /var/www/secret-santa
git pull origin main        # Pull latest code
npm install                 # Install new dependencies
pm2 restart secret-santa    # Restart app
```

### Backup Data
```bash
# Backup data.json
cp /var/www/secret-santa/data.json ~/backup-$(date +%Y%m%d).json

# Download to local machine
scp root@YOUR_DROPLET_IP:/var/www/secret-santa/data.json ./backup.json
```

---

## Troubleshooting

### App not starting?
```bash
# Check logs
pm2 logs secret-santa

# Check if port is in use
sudo lsof -i :3000

# Restart
pm2 restart secret-santa
```

### Can't access website?
```bash
# Check firewall
sudo ufw status

# Check if app is running
pm2 status

# Check Nginx (if using)
sudo systemctl status nginx
sudo nginx -t
```

### Out of memory?
```bash
# Check memory usage
free -h
pm2 monit

# Restart app
pm2 restart secret-santa
```

---

## Security Tips

1. **Change default passwords** in index.html (line 956)
2. **Enable firewall** - only allow necessary ports
3. **Use SSH keys** instead of passwords
4. **Regular updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
5. **Backup data.json** regularly
6. **Use HTTPS** (SSL certificate) for production

---

## Cost Comparison

| Option | Monthly Cost | Setup Time | Difficulty |
|--------|-------------|------------|------------|
| App Platform | $5 | 10 min | Easy |
| Droplet Only | $6 | 30 min | Medium |
| Droplet + Domain | $6 + $12/year | 45 min | Medium |

---

## Support

- DigitalOcean Docs: https://docs.digitalocean.com
- PM2 Docs: https://pm2.keymetrics.io
- Node.js Docs: https://nodejs.org

Good luck with your deployment! 🎅🎄
