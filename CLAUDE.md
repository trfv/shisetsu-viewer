# Shisetsu Viewer - Claude Code Settings

## Quick Start
- **Start Dev**: `npm start` (port 3000)
- **Run Tests**: `npm run test:ci -w @shisetsu-viewer/viewer`  
- **Build**: `npm run build -w @shisetsu-viewer/viewer`
- **Storybook**: `npm run storybook -w @shisetsu-viewer/viewer` (port 6006)

## Project Structure
```
packages/viewer/
├── App.tsx                    # Main app with routing
├── index.tsx                  # Entry point  
├── components/                # UI components (26 components)
├── pages/                     # Route pages
├── hooks/                     # Custom hooks
├── contexts/                  # Auth0 + other contexts
├── constants/                 # Municipality data + constants
├── utils/                     # Helper functions
└── api/
    ├── queries/               # GraphQL queries
    └── graphql-client.tsx     # Generated (don't edit)
```

## Common Tasks

### Adding Features
1. **Components** → `packages/viewer/components/`
2. **Pages** → `packages/viewer/pages/` 
3. **Hooks** → `packages/viewer/hooks/`
4. **Utils** → `packages/viewer/utils/`

### GraphQL Workflow  
1. Edit queries in `packages/viewer/api/queries/`
2. Run: `npm run generate -w @shisetsu-viewer/viewer`
3. Import hooks from `api/graphql-client.tsx`

### Testing
- **Watch**: `npm run test -w @shisetsu-viewer/viewer`
- **CI**: `npm run test:ci -w @shisetsu-viewer/viewer`

## Tech Stack
- **React 19** + TypeScript + Material-UI v7
- **Apollo Client** for GraphQL
- **Vitest** + Testing Library
- **Storybook** for components

## Key Files
- `App.tsx` - Main routing
- `api/graphql-client.tsx` - **Generated** GraphQL hooks
- `constants/municipality/` - Prefecture-specific data
- `.storybook/` - Component documentation

## Conventions
- **Components**: PascalCase with tests alongside
- **Files**: camelCase utilities, PascalCase components  
- **Tests**: `.test.tsx` files
- **Stories**: `.stories.tsx` for Storybook

---

## Important Notes
- This is the **viewer** package in a monorepo
- Use `-w @shisetsu-viewer/viewer` for package-specific commands
- Don't edit `api/graphql-client.tsx` (generated file)
- Japanese text encoding: UTF-8, timezone: Asia/Tokyo