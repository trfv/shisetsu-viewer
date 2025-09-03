# Claude Code Hooks

## Essential Hooks

### After Code Changes
```bash
# Quick lint and format
npm run lint:all --fix
npm run format:all
```

### After GraphQL Changes  
```bash
# Regenerate GraphQL types
npm run generate -w @shisetsu-viewer/viewer
```

### Before Commit
```bash
# Ensure everything works
npm run test:ci -w @shisetsu-viewer/viewer
npm run build -w @shisetsu-viewer/viewer
```

### If Something Breaks
```bash
# Clean and retry
rm -rf packages/viewer/dist packages/viewer/node_modules/.cache
npm install
```

## Quick Commands

### Development
- `npm start` - Start viewer
- `npm run test -w @shisetsu-viewer/viewer` - Test viewer
- `npm run storybook -w @shisetsu-viewer/viewer` - Component docs

### Quality
- `npm run lint:all` - Fix all linting 
- `npm run format:all` - Format all files
- `npm run build:analyze -w @shisetsu-viewer/viewer` - Check bundle size

---

*Keep it simple. These hooks should run fast and help development flow.*