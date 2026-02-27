# Project Context

## Where to Find Things

### Components (`packages/viewer/components/`)
- 26 UI components for the app
- Each component has tests alongside

### Pages (`packages/viewer/pages/`) 
- Route-based page components
- Connected to App.tsx routing

### API (`packages/viewer/api/`)
- `queries/` - GraphQL queries you can edit
- `graphql-client.tsx` - **Generated hooks** (don't edit)

### Constants (`packages/viewer/constants/`)
- `municipality/` - Data for different Japanese cities
- `routes.ts` - Route definitions  
- `styles.ts` - Style constants

### Utils (`packages/viewer/utils/`)
- Helper functions
- Common utilities

### Hooks (`packages/viewer/hooks/`)
- Custom React hooks
- Reusable logic

## Key Entry Points
- `App.tsx` - Main app component with routing
- `index.tsx` - React app entry point
- `contexts/Auth0.tsx` - Authentication setup

## Generated Files (Don't Edit)
- `api/graphql-client.tsx`
- `dist/` directory
- `node_modules/`