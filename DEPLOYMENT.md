# Deployment Guide - Cyber Trace AI

## Quick Deploy to Vercel (Frontend) + Railway (Backend)

This is the fastest deployment option with minimal configuration.

### Option 1: Vercel Frontend + Railway Backend (Recommended)

#### Deploy Frontend to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from project root**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy: `Y`
   - Scope: Your username
   - Link to existing project: `N`
   - Project name: `cybertrace-ai` (or your choice)
   - Directory: `./`
   - Override settings: `N`

4. **Set environment variables in Vercel dashboard**:
   - Go to your project on Vercel
   - Settings → Environment Variables
   - Add:
     - `VITE_API_BASE_URL`: Your backend URL (after backend deployment)
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

#### Deploy Backend to Railway

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Deploy backend**:
   ```bash
   cd server
   railway init
   railway up
   ```

4. **Set environment variables in Railway dashboard**:
   - Go to your Railway project
   - Variables tab
   - Add:
     - `PORT`: `5000`
     - `SUPABASE_URL`: Your Supabase URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
     - `CORS_ALLOWED_ORIGIN`: Your Vercel frontend URL

#### Update CORS Configuration

1. Get your Vercel frontend URL
2. Update `CORS_ALLOWED_ORIGIN` in Railway with that URL
3. Railway will automatically redeploy

### Option 2: Render (Both Services)

This application is configured for deployment on Render using the provided `render.yaml` file.

#### Prerequisites

1. **Render Account**: Create an account at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to a GitHub repository
3. **Supabase Project**: Have your Supabase project URL and keys ready

#### Step-by-Step Deployment

1. **Prepare Your Repository** (already done)
   ```bash
   git add .
   git commit -m "Configure for Render deployment"
   git push origin main
   ```

2. **Create Render Services**:
   - Go to [render.com](https://render.com) and log in
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - Review the configuration and click **"Apply"**

3. **Configure Environment Variables**:
   - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ALLOWED_ORIGIN`
   - Frontend: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

4. **Access Your Application**:
   - Frontend: `https://cybertrace-ai-frontend.onrender.com`
   - Backend: `https://cybertrace-ai-backend.onrender.com`

### Verification Steps

1. **Check Backend Health**:
   ```bash
   curl https://your-backend-url.onrender.com/api/health
   ```
   Should return: `{"status":"ok","message":"Backend is running and reaches Supabase."}`

2. **Test Frontend**:
   - Open your frontend URL in a browser
   - Try logging in (bypass mode works with any credentials)
   - Upload a sample CSV file
   - Verify the graph visualization loads

3. **Check Logs**:
   - Go to Render dashboard
   - Click on your services
   - View logs to ensure no errors

### Troubleshooting

**Build Fails:**
- Check the build logs in Render dashboard
- Ensure all dependencies are in package.json
- Verify TypeScript compilation succeeds locally

**CORS Errors:**
- Ensure `CORS_ALLOWED_ORIGIN` matches your frontend URL exactly
- Check that the frontend URL includes https://

**API Connection Issues:**
- Verify `VITE_API_BASE_URL` is set correctly
- Check backend health endpoint
- Ensure backend service is running

**Supabase Connection Issues:**
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure RLS policies are configured

### Alternative Deployment Options

#### Vercel (Frontend only)

1. Deploy frontend to Vercel
2. Deploy backend separately (Render, Railway, etc.)
3. Update environment variables accordingly

#### Railway

1. Create a Railway account
2. Import your GitHub repository
3. Configure environment variables
4. Railway will detect and deploy both services

### Local Production Build

To test the production build locally:

```bash
# Build client
cd client
npm run build

# Start preview server
npm run preview

# In another terminal, start backend
cd server
npm start
```

### Cost Considerations

- Render Free Tier: Limited hours, services spin down when inactive
- For production: Consider paid plans ($7/month per service)
- Database: Supabase has its own pricing (free tier available)

### Security Notes

- Never commit `.env` files to version control
- Use Render's environment variable management
- Rotate your Supabase keys regularly
- Enable SSL/TLS (automatic on Render)
- Keep dependencies updated

### Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Backend health check passes
- [ ] Authentication works (bypass or Supabase)
- [ ] File upload functionality works
- [ ] Graph visualization renders
- [ ] Report export functions work
- [ ] No console errors in browser
- [ ] No errors in Render logs
- [ ] CORS is properly configured
- [ ] Environment variables are set
