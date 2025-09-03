# Claude Code Custom Prompts

## Component Generation

### React Component with MUI
```
Create a React component using Material-UI that follows the project's patterns:
- Use TypeScript with proper prop types
- Material-UI components and theming
- Responsive design (mobile-first)
- Include JSDoc comments
- Export as default
- Place test file alongside component
- Support Japanese text if applicable
```

### Page Component
```
Create a new page component for routing:
- Use Material-UI layout components (Container, Grid, etc.)
- Include proper page title and meta
- Handle loading and error states
- Use Apollo Client hooks for data fetching
- Follow existing page structure patterns
- Include breadcrumb navigation if nested
```

## Testing

### Component Test
```
Generate comprehensive tests for this component:
- Render testing with Testing Library
- User interaction testing
- Prop validation
- Accessibility testing
- Mock any external dependencies
- Test Japanese text rendering if applicable
- Include edge cases and error states
```

### Integration Test  
```
Create integration tests for this feature:
- Test complete user workflows
- Mock GraphQL responses with Apollo MockProvider
- Test routing and navigation
- Verify data persistence
- Test error handling and recovery
```

## GraphQL

### Query Generation
```
Create a GraphQL query for this data requirement:
- Use proper TypeScript types
- Include error handling
- Add loading states
- Follow Apollo Client patterns
- Consider caching strategy
- Include proper fragments for reusability
```

### Hook Creation
```
Create a custom hook for this GraphQL operation:
- Handle loading, error, and data states
- Include proper TypeScript types
- Add retry logic if needed
- Consider optimistic updates
- Follow existing hook patterns
```

## Styling

### MUI Theming
```
Create or update Material-UI theme configuration:
- Support light/dark mode
- Include Japanese font stacks
- Define consistent spacing
- Set up color palette
- Configure component variants
- Ensure accessibility compliance
```

### Component Styling
```
Style this component using Material-UI best practices:
- Use sx prop for custom styles
- Leverage theme values
- Ensure responsive design
- Support right-to-left text
- Follow Material Design guidelines
- Consider Japanese text layout
```

## Utils and Helpers

### Utility Function
```
Create a utility function that:
- Has comprehensive TypeScript types
- Includes JSDoc documentation
- Has unit tests
- Follows functional programming patterns
- Handles edge cases gracefully
- Supports internationalization if needed
```

### Date/Time Utility
```
Create date/time utility for Japanese locale:
- Use date-fns library
- Handle JST timezone properly
- Format for Japanese users
- Include business hour calculations
- Support calendar formatting
- Add proper type definitions
```

## Forms and Validation

### Form Component
```
Create a form component with:
- React Hook Form integration
- Material-UI form components
- Proper validation with error messages
- Accessibility attributes
- Loading and disabled states
- Support for Japanese input
- Clear error handling
```

### Validation Schema
```
Create validation schema that:
- Uses appropriate validation library
- Supports Japanese text input
- Includes proper error messages
- Handles edge cases
- Is reusable across forms
- Has TypeScript types
```

## Performance

### Code Optimization
```
Optimize this code for performance:
- Use React.memo where appropriate
- Implement proper useMemo/useCallback
- Consider code splitting opportunities
- Optimize bundle size
- Improve loading times
- Add performance monitoring
```

### Bundle Analysis
```
Analyze and optimize bundle:
- Identify large dependencies
- Implement code splitting
- Remove unused code
- Optimize imports
- Use dynamic imports where beneficial
- Monitor bundle size changes
```