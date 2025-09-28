# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev              # Start development server on port 3001
npm run build            # TypeScript compile + Vite production build
npm run preview          # Preview production build locally
npm run lint             # Run ESLint
npm test                 # Run all tests once
npm test -- --watch      # Run tests in watch mode
npm run generate-client  # Regenerate API client from api-docs.json
```

## Architecture Overview

### State Management Pattern
The application uses a layered state management approach:
- **Global State**: React Context providers (AuthContext, LoggedUserContext)
- **Server State**: TanStack React Query for API data caching and synchronization
- **Token Storage**: Dual storage system - localStorage for "remember me", sessionStorage for temporary

### Authentication Flow
1. Token is managed by `AuthProvider` context in `src/context/auth.context.tsx`
2. Custom Axios instance (`src/api/custom-instance.ts`) automatically injects `Authorization: Bearer ${token}` headers
3. Protected routes use `ProtectedRoute` component that checks authentication status
4. 401 responses trigger automatic logout via React Query's global error handler

### API Client Architecture
The API layer is **completely auto-generated** from OpenAPI specification using Orval:
- **Input**: `api-docs.json` (OpenAPI spec from backend)
- **Output**: `src/api/` directory organized by OpenAPI tags
- **Generated artifacts**: TypeScript models, React Query hooks, MSW mocks
- **Never manually edit** files in `src/api/` - they will be overwritten

To update API definitions:
1. Get latest `api-docs.json` from backend Swagger UI
2. Run `npm run generate-client`

### Routing and Layout System
Routes are organized by authentication requirement:
- **LoginLayout**: Unauthenticated routes (login, password recovery)
- **AuthenticatedLayout**: Protected routes with sidebar navigation
- **DynamicLayout**: Routes that adapt based on auth status

Route definitions are in `src/App.tsx` with nested structure for supply points management.

### Testing Strategy
- **Framework**: Vitest with jsdom environment
- **Convention**: Test files use `.spec.tsx` extension (not `.test.tsx`)
- **Location**: Tests are colocated with components
- **API Mocking**: MSW (Mock Service Worker) auto-generated for all endpoints
- **Pattern**: Use React Testing Library with `@testing-library/jest-dom` matchers

### Environment Variables
- **Required prefix**: `CONLUZ_` for all environment variables
- **Main variable**: `CONLUZ_API_URL` (backend API endpoint)
- **Docker support**: Variables are hot-swappable at container startup via `docker/env.sh`

### Component Organization
Each component follows this structure:
```
components/ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.spec.tsx  # Tests
└── index.tsx              # Re-export
```

### Key Development Patterns
1. **TypeScript-first**: Full type coverage with auto-generated API types
2. **Hybrid styling**: Material-UI components + Tailwind CSS utilities
3. **Mobile-responsive**: MIN_DESKTOP_WIDTH = 768px breakpoint
4. **Error boundaries**: Global error handling with automatic 401 processing
5. **Code splitting**: Manual chunk configuration in `vite.config.ts` for optimization

### Critical Files to Understand
- `src/main.tsx`: Application bootstrap with provider hierarchy
- `src/api/custom-instance.ts`: Axios configuration with auth interceptor
- `orval.config.js`: API client generation configuration
- `src/context/auth.context.tsx`: Authentication state management
- `src/layouts/authenticated.layout.tsx`: Protected route implementation

## Project-Specific Conventions

### API Integration Pattern
When working with API endpoints:
1. Never modify files in `src/api/` directly
2. Use the auto-generated React Query hooks (e.g., `useGetSupplies`, `useCreateSupply`)
3. Handle loading/error states using React Query's built-in states
4. Mutations automatically invalidate related queries

### Form Handling
Forms use controlled components with Material-UI inputs. Supply forms (`SupplyForm`) serve as the primary reference for complex form patterns.

### Data Fetching Pattern
```typescript
// Use auto-generated hooks
const { data, isLoading, error } = useGetSupplies();

// Mutations with automatic cache invalidation
const mutation = useCreateSupply();
mutation.mutate(data, {
  onSuccess: () => {
    // Handle success
  }
});
```

### Docker Development
For containerized development:
```bash
cd docker
docker compose up -d  # Runs on port 3001
```

The Docker setup includes nginx configuration for proper SPA routing and dynamic environment variable injection.