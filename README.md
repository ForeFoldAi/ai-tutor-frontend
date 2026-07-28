# AI Tutor Platform - Client

This is the standalone client application for the AI Tutor Platform. It can be deployed as a static site without any backend APIs.

## Prerequisites

- Node.js 18+ and npm

## Setup

1. Install dependencies:
```bash
npm install
```

## Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Building for Production

Build the static site:
```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Deployment

### Vercel

**Option 1: Deploy via Vercel Dashboard (Recommended)**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New Project"
4. Import your repository
5. Vercel will automatically detect the `vercel.json` configuration
6. Set Environment Variables (required for API + WebSockets):
   - `VITE_API_URL` = your backend HTTPS URL (e.g. `https://api.yourdomain.com`)
   - `VITE_VOICE_URL` = same backend URL (voice WS + `/chat-voice`)
   - See `.env.production.example`
7. Ensure the backend `ALLOWED_ORIGINS` includes your Vercel domain
8. Click "Deploy"

**Option 2: Deploy via Vercel CLI**
```bash
# Use npx (no installation needed)
npx vercel

# Or for production deployment
npm run deploy:prod
```

**Option 3: Install Vercel CLI locally**
If you have permission issues with global installs:
```bash
# Install locally in the project
npm install --save-dev vercel

# Then run
npx vercel
```

### Netlify

1. Push your code to GitHub
2. Import your repository in [Netlify](https://netlify.com)
3. Netlify will automatically detect the `netlify.toml` configuration
4. Deploy!

Or use the Netlify CLI:
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### GitHub Pages

1. Build the project: `npm run build`
2. Configure GitHub Pages to serve from the `dist` directory
3. For SPA routing, you may need to add a `404.html` that redirects to `index.html`

### Other Static Hosting

Any static hosting service can host the `dist` folder:
- AWS S3 + CloudFront
- Firebase Hosting
- Cloudflare Pages
- Azure Static Web Apps

## Demo Mode

🎉 **This client is configured for DEMO MODE** - it works completely offline without any backend APIs!

### Demo Login Credentials

You can log in with any of these demo accounts:

| Role | Username | Password |
|------|----------|----------|
| Student | `student` | `password` |
| Tutor | `tutor` | `password` |
| School Admin | `admin` | `password` |
| Master Admin | `master` | `password` |

You can also create new accounts through the signup page - they will work in demo mode!

### Features in Demo Mode

- ✅ **Authentication**: Login and signup work without backend
- ✅ **AI Chat**: Mock AI responses simulate real chat interactions
- ✅ **All UI Pages**: All pages are accessible and functional
- ✅ **Role-based Dashboards**: Different dashboards for each user role
- ✅ **No API Calls**: Everything works offline

### Disabling Demo Mode

To connect to a real backend, edit `client/src/lib/mock-api.ts` and set:
```typescript
export const USE_MOCK_API = false;
```

Then update API endpoints in `client/src/lib/queryClient.ts` to point to your backend server.

## Important Notes

⚠️ **This is a client-only deployment configured for demo purposes.** For production with a backend:

1. Set `USE_MOCK_API = false` in `mock-api.ts`
2. Update API endpoints in the code to point to your backend server
3. Configure CORS on your backend to allow requests from your deployed client domain
4. Set up environment variables if needed for API URLs

### Building from the Client Directory

If you're building from within the `client` directory, make sure the parent directory structure is intact (specifically the `shared` folder) as the client references shared TypeScript types. These types are compiled into the build, so the `shared` folder is only needed during the build process, not in the deployed output.

## Project Structure

```
client/
├── src/              # Source code
├── public/           # Static assets
├── dist/             # Build output (generated)
├── index.html        # Entry HTML file
├── vite.config.ts    # Vite configuration
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run check` - Type check without emitting files
