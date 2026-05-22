# FitCore Pro - Vite Setup Guide

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `react` & `react-dom` - Core React libraries
- `vite` - Fast build tool
- `@vitejs/plugin-react` - React plugin for Vite

### 2. File Structure After Setup
```
training-app/
├── index.html               # Vite entry point (moved from public/)
├── vite.config.js          # Vite configuration
├── package.json            # Updated with Vite scripts
├── src/
│   ├── App.jsx            # Main app component
│   ├── styles/            # CSS files (copied from public/)
│   └── components/        # Component modules
├── public/                # Static assets
│   ├── login.html
│   └── app.jsx            # (Old - can be deleted)
└── dist/                  # Build output (created on build)
```

## Scripts

### Development Server
```bash
npm run dev
```
- Starts Vite dev server (default: `http://localhost:5173`)
- Hot Module Replacement (HMR) enabled
- Auto-opens in browser

### Build for Production
```bash
npm run build
```
- Creates optimized production build in `dist/` folder
- Minifies and optimizes all code

### Preview Production Build
```bash
npm run preview
```
- Serves the production build locally for testing

### Run Express Server
```bash
npm start
```
- Runs your Express backend (Node.js)

## Key Changes

✅ **Module System**: Now using proper ES6 imports/exports
✅ **React Imports**: React components import React directly (not from window)
✅ **CSS Imports**: Styles are imported as modules in App.jsx
✅ **Build Tool**: Vite for faster development and optimized production builds
✅ **Development**: Hot reload on file changes

## Development Workflow

1. **Start Vite Dev Server**:
   ```bash
   npm run dev
   ```

2. **Edit components** in `src/components/`
   - Changes auto-refresh in browser
   - No manual reload needed

3. **Add new components**:
   - Create in appropriate `src/components/` folder
   - Use proper ES6 imports
   - Import React hooks as needed

4. **Build for production**:
   ```bash
   npm run build
   ```

## Integration with Express Server

Your Express server can serve the built files:

```javascript
// In src/server.js
app.use(express.static('dist'));
```

Then in production:
```bash
npm run build  # Build React app
npm start      # Start Express, which serves dist/ folder
```

## Troubleshooting

### Port 5173 already in use?
```bash
npm run dev -- --port 3000
```

### Import path issues?
Use the `@` alias defined in `vite.config.js`:
```javascript
import { Header } from '@/components/Header/index.jsx';
```

### CSS not loading?
All CSS files are imported in `src/App.jsx`. Make sure your CSS files are in `src/styles/`

## Next Steps

1. Delete `public/app.jsx` (no longer needed)
2. Keep `public/login.html` and integrate login with your Express backend
3. Set up environment variables in `.env` if needed
4. Update your Express server to serve the built React app
