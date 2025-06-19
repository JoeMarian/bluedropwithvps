# TankManage Deployment Guide

## Hosting on Cloudflare with Custom Domain

This guide will help you deploy TankManage to Cloudflare Pages with your domain `tankmanage.teamskrn.xyz`.

## Prerequisites

1. **Domain**: `tankmanage.teamskrn.xyz` (already configured)
2. **Cloudflare Account**: With Pages enabled
3. **Backend API**: Your FastAPI backend needs to be hosted separately

## Step 1: Backend Deployment

First, deploy your FastAPI backend to a hosting service (VPS, Railway, Render, etc.) and get the API URL.

### Backend Configuration
Update your backend CORS settings in `app/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",  # Development
        "https://tankmanage.teamskrn.xyz",  # Production
        "https://*.teamskrn.xyz"  # All subdomains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 2: Frontend Configuration

### Environment Variables
Create a `.env.production` file in the `frontend` directory:

```env
VITE_API_URL=https://your-backend-api-url.com/api/v1
```

Replace `your-backend-api-url.com` with your actual backend domain.

### Build the Frontend

```bash
cd frontend
npm install
npm run build
```

This will create a `dist` folder with the production build.

## Step 3: Cloudflare Pages Deployment

### Option A: Git-based Deployment (Recommended)

1. **Push to GitHub**: Push your code to a GitHub repository
2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository
   - Configure build settings:
     - **Framework preset**: None
     - **Build command**: `cd frontend && npm install && npm run build`
     - **Build output directory**: `frontend/dist`
     - **Root directory**: `/` (leave empty)
   - Add environment variables:
     - `VITE_API_URL`: `https://your-backend-api-url.com/api/v1`

### Option B: Manual Upload

1. **Upload Build Files**:
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project" → "Direct Upload"
   - Upload the contents of the `frontend/dist` folder
   - Set the project name to `tankmanage`

## Step 4: Domain Configuration

### Cloudflare DNS Settings

1. **Add DNS Record**:
   - Type: `CNAME`
   - Name: `tankmanage`
   - Target: `your-pages-project.pages.dev`
   - Proxy status: Proxied (orange cloud)

2. **Custom Domain in Pages**:
   - Go to your Pages project → Custom domains
   - Add `tankmanage.teamskrn.xyz`
   - Update DNS if needed

### SSL/TLS Settings

1. **SSL/TLS Mode**: Full (strict) or Full
2. **Always Use HTTPS**: On
3. **Minimum TLS Version**: 1.2

## Step 5: Cloudflare Workers (Optional)

For better performance, you can create a Cloudflare Worker to handle API proxying:

```javascript
// worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Proxy API requests to your backend
  if (url.pathname.startsWith('/api/')) {
    const backendUrl = 'https://your-backend-api-url.com' + url.pathname + url.search
    return fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
  }
  
  // Serve static files
  return fetch(request)
}
```

## Step 6: Testing

1. **Test the Frontend**: Visit `https://tankmanage.teamskrn.xyz`
2. **Test API Calls**: Check browser console for any CORS or API errors
3. **Test Authentication**: Try logging in with admin credentials

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend CORS settings include your domain
2. **API Connection**: Verify the `VITE_API_URL` environment variable is correct
3. **Build Errors**: Check the build logs in Cloudflare Pages
4. **Domain Issues**: Ensure DNS propagation is complete (can take up to 24 hours)

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are going to the correct URL
3. **Check Cloudflare Logs**: Review Pages deployment logs
4. **Test API Directly**: Try calling your API endpoints directly

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **API Keys**: Use environment variables for all API keys
3. **CORS**: Restrict CORS origins to only your domains
4. **HTTPS**: Always use HTTPS in production

## Performance Optimization

1. **Cloudflare Caching**: Configure caching rules for static assets
2. **Image Optimization**: Use Cloudflare's image optimization
3. **Minification**: Ensure build process minifies CSS/JS
4. **CDN**: Cloudflare automatically provides global CDN

## Monitoring

1. **Analytics**: Enable Cloudflare Analytics
2. **Error Tracking**: Set up error monitoring
3. **Performance**: Monitor Core Web Vitals
4. **Uptime**: Set up uptime monitoring for your backend API

## Support

If you encounter issues:
1. Check Cloudflare Pages documentation
2. Review build logs and error messages
3. Test locally with production environment variables
4. Verify all environment variables are set correctly 