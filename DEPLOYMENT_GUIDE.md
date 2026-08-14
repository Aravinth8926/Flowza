# Vendor AI - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying Vendor AI to production environments.

---

## 📦 Backend Deployment Options

### Option 1: Heroku (Recommended for Quick Setup)

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Steps

1. **Login to Heroku**
```bash
heroku login
```

2. **Create Heroku App**
```bash
heroku create vendor-ai-backend
```

3. **Add PostgreSQL**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

4. **Set Environment Variables**
```bash
heroku config:set SECRET_KEY="your-production-secret-key-here"
heroku config:set ALGORITHM="HS256"
heroku config:set ACCESS_TOKEN_EXPIRE_MINUTES="30"
heroku config:set ALLOWED_ORIGINS="https://your-web-app.vercel.app"
heroku config:set ENVIRONMENT="production"
```

5. **Deploy**
```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

6. **Initialize Database**
```bash
heroku run python backend/create_admin.py
```

7. **Check Logs**
```bash
heroku logs --tail
```

Your API will be available at: `https://vendor-ai-backend.herokuapp.com`

---

### Option 2: Railway (Modern Alternative)

1. **Sign up at** [railway.app](https://railway.app)

2. **Create New Project** → Deploy from GitHub

3. **Add PostgreSQL Database**

4. **Set Environment Variables** in Railway dashboard

5. **Deploy automatically** on git push

---

### Option 3: AWS EC2 (Full Control)

#### Setup EC2 Instance

1. **Launch EC2 Instance**
   - Ubuntu Server 22.04 LTS
   - t2.micro (free tier) or larger
   - Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8000 (API)

2. **SSH into Instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Dependencies**
```bash
sudo apt update
sudo apt install python3-pip python3-venv nginx supervisor -y
```

4. **Clone Repository**
```bash
git clone https://github.com/your-repo/vendor-ai.git
cd vendor-ai/backend
```

5. **Setup Virtual Environment**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

6. **Configure Environment**
```bash
nano .env
```

Add production values.

7. **Setup Supervisor** (Process Manager)

Create `/etc/supervisor/conf.d/vendor-ai.conf`:
```ini
[program:vendor-ai]
directory=/home/ubuntu/vendor-ai/backend
command=/home/ubuntu/vendor-ai/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
user=ubuntu
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/vendor-ai.log
```

Start supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start vendor-ai
```

8. **Setup Nginx** (Reverse Proxy)

Create `/etc/nginx/sites-available/vendor-ai`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/vendor-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

9. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 🌐 Frontend Deployment

### Web App (Next.js) → Vercel

#### Quick Deploy

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Navigate to Web Directory**
```bash
cd apps/web
```

3. **Deploy**
```bash
vercel --prod
```

4. **Set Environment Variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL

#### Alternative: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy automatically on push

---

### Web App → AWS S3 + CloudFront

1. **Build App**
```bash
cd apps/web
npm run build
```

2. **Create S3 Bucket**
   - Enable static website hosting
   - Set bucket policy for public read

3. **Upload Build**
```bash
aws s3 sync out/ s3://your-bucket-name --delete
```

4. **Setup CloudFront**
   - Create distribution pointing to S3
   - Configure custom domain
   - Enable HTTPS

---

## 📱 Mobile App Deployment

### iOS (App Store)

1. **Setup Apple Developer Account** ($99/year)

2. **Install EAS CLI**
```bash
npm install -g eas-cli
```

3. **Login to Expo**
```bash
eas login
```

4. **Configure Build**
```bash
cd apps/mobile
eas build:configure
```

5. **Update app.json**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.vendorai",
      "buildNumber": "1.0.0"
    }
  }
}
```

6. **Build for iOS**
```bash
eas build --platform ios
```

7. **Submit to App Store**
```bash
eas submit --platform ios
```

---

### Android (Play Store)

1. **Setup Google Play Developer Account** ($25 one-time)

2. **Build for Android**
```bash
eas build --platform android
```

3. **Submit to Play Store**
```bash
eas submit --platform android
```

---

### Internal Distribution (No App Store)

#### iOS (TestFlight)
```bash
eas build --platform ios --profile preview
```

Share the link with testers.

#### Android (APK)
```bash
eas build --platform android --profile preview
```

Download and share APK file.

---

## 🗄️ Database Production Setup

### PostgreSQL on AWS RDS

1. **Create RDS Instance**
   - PostgreSQL 14+
   - db.t3.micro or larger
   - Enable automated backups

2. **Configure Security Group**
   - Allow port 5432 from backend server

3. **Update Backend .env**
```env
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/vendor_ai
```

4. **Run Migrations**
```bash
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

---

## 🔒 Security Checklist

### Backend

- [ ] Use strong SECRET_KEY (generate with `openssl rand -hex 32`)
- [ ] Enable HTTPS only in production
- [ ] Set ALLOWED_ORIGINS to your frontend domains only
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting
- [ ] Setup monitoring and logging
- [ ] Regular security updates
- [ ] Use strong database passwords
- [ ] Enable firewall rules
- [ ] Setup backup strategy

### Frontend

- [ ] Use HTTPS
- [ ] Store tokens securely
- [ ] Implement CSP headers
- [ ] Sanitize user inputs
- [ ] Enable CORS properly
- [ ] Minify and obfuscate code
- [ ] Regular dependency updates

---

## 📊 Monitoring Setup

### Backend Monitoring (Sentry)

1. **Install Sentry**
```bash
pip install sentry-sdk[fastapi]
```

2. **Initialize in main.py**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
)
```

### Application Performance Monitoring

Consider:
- **New Relic**: Full stack monitoring
- **DataDog**: Infrastructure and APM
- **CloudWatch**: AWS native monitoring

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "vendor-ai-backend"
          heroku_email: "your-email@example.com"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--prod'
```

---

## 🧪 Pre-Deployment Testing

1. **Test all API endpoints**
2. **Verify authentication flows**
3. **Test WebSocket connections**
4. **Check mobile app on real devices**
5. **Performance testing with large datasets**
6. **Cross-browser testing**
7. **Security scanning**

---

## 📈 Scaling Considerations

### Backend Scaling

- **Horizontal Scaling**: Add more instances behind load balancer
- **Vertical Scaling**: Increase instance size
- **Database**: Read replicas for analytics queries
- **Caching**: Redis for frequently accessed data
- **CDN**: CloudFront/CloudFlare for static assets

### Database Optimization

- Index frequently queried columns
- Use connection pooling
- Implement query caching
- Archive old data
- Regular vacuum/analyze

---

## 🔧 Post-Deployment

1. **Test Production URLs**
2. **Setup monitoring alerts**
3. **Configure backup schedules**
4. **Document deployment process**
5. **Create rollback plan**
6. **Setup logging aggregation**
7. **Performance monitoring**

---

## 📞 Support

For deployment issues:
- Check logs first
- Verify environment variables
- Test connections between services
- Check firewall/security groups
- Review documentation
- Contact cloud provider support

---

## 🎉 Deployment Complete!

Your Vendor AI system is now live in production! 🚀

Monitor performance and iterate based on user feedback.
