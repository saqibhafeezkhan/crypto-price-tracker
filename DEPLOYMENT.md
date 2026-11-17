# Deployment Guide

This guide covers deployment options for the Crypto Price Tracker application.

> **ℹ️ Static hosting is enough.** The app fetches market data straight from the browser
> and caches it for four hours in `localStorage`, so `npm run build` plus any static
> host (Vercel, Netlify, GitHub Pages) works — no Node process to run. Set
> `VITE_COINGECKO_API_KEY` and, optionally, `VITE_COINMARKETCAP_API_KEY` in the host's
> environment; those values are compiled into the bundle, so treat them as public.

## 🔐 Pre-Deployment Checklist

- [ ] Environment variables are set up correctly
- [ ] Code passes linting: `npm run lint`
- [ ] Application builds successfully: `npm run build`
- [ ] No console errors in development
- [ ] All features tested locally
- [ ] README.md is complete and accurate
- [ ] `.env.local` is in `.gitignore` (never commit API keys)
- [ ] Version number updated in `package.json`

## 🚀 Deployment Options

### 1. Vercel (Recommended - Easiest)

Vercel is the creator of Next.js and provides excellent support for Vite applications.

#### Steps:

1. **Push your code to GitHub**

   ```bash
   git push origin main
   ```

2. **Create Vercel account** at [vercel.com](https://vercel.com)

3. **Import project**:
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Click "Import"

4. **Configure environment variables**:
   - Go to Settings → Environment Variables
   - Add: `VITE_COINGECKO_API_KEY` = your API key
   - Optional: `VITE_COINMARKETCAP_API_KEY` = your CoinMarketCap key (fallback when CoinGecko is rate limited)

5. **Deploy**:
   - Vercel will automatically deploy from the main branch
   - Your app will be live at `your-project.vercel.app`

**Note**: Vercel automatically detects Vite and uses the correct build settings.

### 2. Netlify

#### Steps:

1. **Create Netlify account** at [netlify.com](https://netlify.com)

2. **Connect GitHub repository**:
   - Click "New site from Git"
   - Choose GitHub
   - Select your repository

3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

4. **Set environment variables**:
   - Go to Site settings → Build & deploy → Environment
   - Add: `VITE_COINGECKO_API_KEY`
   - Optional: `VITE_COINMARKETCAP_API_KEY` (fallback when CoinGecko is rate limited)

### 3. GitHub Pages

#### Steps:

1. **Update `vite.config.js`** (if deploying to `github.com/username/crypto-price-tracker`):

   ```javascript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     base: '/crypto-price-tracker/', // Add this line
   });
   ```

2. **Add GitHub Pages deployment script** to `package.json`:

   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. **Install gh-pages**:

   ```bash
   npm install --save-dev gh-pages
   ```

4. **Deploy**:

   ```bash
   npm run deploy
   ```

5. **Configure GitHub**:
   - Go to repository Settings → Pages
   - Source: `Deploy from a branch`
   - Branch: Select the branch containing your gh-pages deployment

### 4. Docker Deployment

#### Dockerfile:

```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g http-server
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["http-server", "dist", "-p", "3000"]
```

#### Build and run:

```bash
docker build -t crypto-tracker .
docker run -p 3000:3000 -e VITE_COINGECKO_API_KEY=your_key crypto-tracker
```

### 5. Traditional Server (VPS/Hosting)

#### Steps:

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Upload the `dist` folder** to your server

3. **Configure web server** (Nginx example):

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/crypto-tracker/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Enable HTTPS** with Let's Encrypt

5. **Restart web server**

## 📊 Performance Optimization

Before deploying:

1. **Build analysis**:

   ```bash
   npm run build
   # Check the dist folder size
   ```

2. **Enable compression** in your web server

3. **Use CDN** for faster global delivery

4. **Set cache headers** for static assets

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 🔒 Security Considerations

1. **API Key Management**:
   - Never commit `.env.local`
   - Use environment variables in deployment
   - Rotate keys regularly

2. **CORS**:
   - The CoinGecko API doesn't require CORS configuration for free tier
   - Monitor CORS errors in production

3. **Content Security Policy (CSP)**:
   - Configure appropriate CSP headers
   - Allow CoinGecko API domain

## 🐛 Troubleshooting

### Build fails

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 404 errors on routes

- Ensure your hosting is configured to serve `index.html` for all routes
- This is especially important for React Router

### API key not working

- Verify key is set as environment variable
- Check if API quota exceeded
- Ensure URL is correct in code

### Slow performance

- Enable gzip compression
- Use CDN
- Optimize images
- Check browser DevTools

## 📈 Post-Deployment

1. **Monitor performance**:
   - Use Google Lighthouse
   - Monitor API response times
   - Track error rates

2. **Set up alerts** for:
   - API failures
   - High error rates
   - Deployment failures

3. **Regular updates**:
   - Keep dependencies updated
   - Monitor security vulnerabilities
   - Plan feature updates

## 🆘 Support

For deployment issues:

1. Check the platform's documentation
2. Open an issue on GitHub
3. Check browser console for errors
4. Use `npm run build` locally to verify

---

**Happy Deploying! 🚀**
