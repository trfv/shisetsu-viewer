# Claude Code Development Rules

## Code Quality Standards

### TypeScript
- **Strict Mode**: Always use strict TypeScript configuration
- **Type Definitions**: Prefer interfaces over types for object shapes
- **Any Types**: Avoid `any` - use `unknown` or proper typing
- **Null Safety**: Use optional chaining and nullish coalescing
- **Generic Constraints**: Always constrain generic types properly

### React Patterns
- **Functional Components**: Always use function components over class components
- **Hooks**: Use hooks properly (only at top level, in correct order)
- **Props**: Use destructuring for props, avoid prop drilling
- **State**: Prefer `useState` over `useReducer` for simple state
- **Effects**: Use `useEffect` appropriately, include dependencies

### Material-UI Conventions
- **Theme Usage**: Always use theme values instead of hardcoded values
- **Responsive Design**: Use breakpoint system for responsive layouts
- **Component Variants**: Prefer built-in variants over custom styling
- **Accessibility**: Include proper ARIA attributes and keyboard navigation
- **sx Prop**: Use `sx` prop for custom styling over `styled` components

## File Organization

### Directory Structure
```
packages/viewer/
├── components/          # Reusable UI components
│   ├── ComponentName/
│   │   ├── index.tsx           # Main component
│   │   ├── ComponentName.test.tsx  # Tests
│   │   └── ComponentName.stories.tsx  # Storybook
├── pages/              # Route-based page components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── utils/              # Pure utility functions
├── constants/          # App constants and enums
└── api/               # GraphQL queries and generated code
```

### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase starting with `use` (`useUserData.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Types**: PascalCase (`UserData.ts`)

## Import/Export Rules

### Import Order
1. React and React-related imports
2. Third-party libraries  
3. Internal utilities and hooks
4. Components (relative imports last)
5. Type-only imports (use `import type`)

### Export Patterns
- **Components**: Always default export the main component
- **Utilities**: Named exports for multiple related functions
- **Constants**: Named exports for all constants
- **Types**: Named exports, group in index files

## Testing Requirements

### Component Tests
- **Render Testing**: Every component must have basic render test
- **User Interactions**: Test all clickable elements and form inputs
- **Props**: Test component behavior with different prop combinations
- **Error States**: Test error handling and fallback UI
- **Accessibility**: Include basic accessibility tests

### Test Structure
```typescript
describe('ComponentName', () => {
  it('renders correctly', () => {
    // Basic render test
  });
  
  it('handles user interactions', () => {
    // User event testing
  });
  
  it('displays error states', () => {
    // Error handling
  });
});
```

## GraphQL Standards

### Query Organization
- **Fragments**: Create reusable fragments for common data shapes
- **Naming**: Use descriptive query names (e.g., `GetUserProfile`)
- **Error Handling**: Always handle loading and error states
- **Caching**: Consider Apollo Client caching strategy

### Hook Patterns
```typescript
export const useUserData = (userId: string) => {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { userId },
    errorPolicy: 'all',
  });
  
  return {
    user: data?.user,
    loading,
    error,
  };
};
```

## Performance Guidelines

### Bundle Optimization
- **Code Splitting**: Use dynamic imports for route-based splitting
- **Tree Shaking**: Import only what's needed from libraries
- **Bundle Analysis**: Regularly check bundle size with analyzer

### React Performance
- **Memoization**: Use `React.memo` for expensive components
- **Callbacks**: Use `useCallback` for stable function references
- **Heavy Computations**: Use `useMemo` for expensive calculations
- **List Rendering**: Always use proper `key` props

## Accessibility Requirements

### Semantic HTML
- Use proper heading hierarchy (h1, h2, h3...)
- Use semantic elements (`nav`, `main`, `article`, `section`)
- Include proper form labels and descriptions

### ARIA Support
- Add ARIA labels for complex interactions
- Use proper ARIA roles for custom components  
- Include focus management for modals and overlays

### Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Implement proper focus trapping for modals
- Use visible focus indicators

## Japanese Localization

### Text Handling
- **Font Support**: Ensure proper Japanese font loading
- **Text Direction**: Support both horizontal and vertical text
- **Input Validation**: Handle Japanese characters in forms
- **Date/Time**: Use Japanese locale formatting

### Cultural Considerations
- **Color Usage**: Consider cultural color meanings
- **Layout**: Support Japanese reading patterns
- **Content**: Use appropriate Japanese terminology

## Error Handling

### Error Boundaries
- Implement error boundaries for component trees
- Provide meaningful error messages to users
- Log errors for debugging in development

### API Errors
- Handle network failures gracefully
- Show user-friendly error messages
- Provide retry mechanisms where appropriate

## Security Practices

### Data Handling
- Sanitize user inputs
- Avoid storing sensitive data in localStorage
- Use secure authentication patterns with Auth0

### Code Security
- Keep dependencies updated
- Avoid exposing sensitive configuration
- Use environment variables for secrets

## Documentation Standards

### Code Comments
- Use JSDoc for functions and components
- Explain complex business logic
- Document API interfaces and types

### README Updates
- Keep installation instructions current
- Document new features and breaking changes
- Include usage examples for complex components