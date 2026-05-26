# Conluz Web

Web interface made in React to interact with [Conluz](https://github.com/lucoenergia/conluz), an energy management system focused on energy communities.

## 🏗 Tech Stack

- **Framework**: React 19.1 with TypeScript
- **Build Tool**: Vite 7.0
- **Routing**: React Router 7.6
- **UI Components**: Material-UI (MUI) 7.2
- **State Management**: TanStack React Query 5.81
- **API Client**: Auto-generated from OpenAPI spec using Orval
- **Testing**: Vitest with React Testing Library
- **Charts**: ApexCharts
- **Date Handling**: Day.js
- **HTTP Client**: Axios

## 📁 Project Structure

```
conluz-web/
├── src/
│   ├── api/           # Auto-generated API client (organized by tags)
│   │   ├── authentication/
│   │   ├── configuration/
│   │   ├── consumption/
│   │   ├── models/
│   │   ├── plants/
│   │   ├── prices/
│   │   ├── production/
│   │   ├── supplies/
│   │   └── users/
│   ├── components/    # Reusable UI components
│   │   ├── AppAccordion/
│   │   ├── AppCard/       # Base card primitive
│   │   ├── Auth/
│   │   ├── Breadcrumb/
│   │   ├── CardGrid/
│   │   ├── DetailHeader/  # Shared header for detail pages
│   │   ├── ErrorBoundries/
│   │   ├── Errors/
│   │   ├── FilterChips/
│   │   ├── Forms/
│   │   ├── Graph/
│   │   ├── Header/
│   │   ├── Menu/
│   │   ├── Modals/        # AppModal + confirmation/import modals
│   │   ├── PaginatedList/
│   │   ├── Pagination/
│   │   ├── SearchBar/
│   │   ├── Stat/
│   │   ├── SupplyCard/
│   │   ├── SupplyDetailCard/
│   │   ├── SupplyForm/
│   │   └── PageHeader/
│   ├── context/       # React Context providers (auth, user)
│   ├── layouts/       # Page layouts
│   │   ├── authenticated.layout.tsx
│   │   ├── login.layout.tsx
│   │   └── dynamic.layout.tsx
│   ├── pages/         # Route pages
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── NewPassword.tsx
│   │   ├── SupplyPointsPage.tsx
│   │   ├── SupplyDetailPage.tsx
│   │   ├── CreateSupply.tsx
│   │   ├── EditSupply.tsx
│   │   └── Contact.page.tsx
│   └── utils/         # Utility functions
├── docker/            # Docker configuration
│   ├── docker-compose.yaml
│   ├── Dockerfile
│   ├── nginx.conf
│   └── env.sh
├── public/           # Static assets
├── docs/             # Documentation
└── api-docs.json     # OpenAPI specification
```

## 🚀 Key Features

1. **Supply Point Management**: Create, edit, and view energy supply points
2. **Authentication System**: Login, password recovery, token-based auth
3. **Energy Data Visualization**: Consumption and production graphs using ApexCharts
4. **Responsive Design**: Mobile-friendly interface with MUI responsive breakpoints
5. **Multi-layout Support**: Different layouts for authenticated/unauthenticated pages
6. **Auto-generated API**: Type-safe API client generated from OpenAPI specification
7. **Real-time Data**: Energy consumption and production tracking
8. **User Management**: Profile management and user settings

## 📄 Main Routes

- **Home** (`/`): Dashboard/landing page
- **Supply Points** (`/supply-points`): List and manage energy supply points
- **New Supply** (`/supply-points/new`): Create a new supply point
- **Supply Detail** (`/supply-points/:id`): Detailed view of a supply point
- **Edit Supply** (`/supply-points/:id/edit`): Edit supply point information
- **Login** (`/login`): User authentication
- **Forgot Password** (`/forgot-password`): Password recovery flow
- **Reset Password** (`/forgot-password/:token`): Password reset with token
- **Contact** (`/contact`): Support and contact page

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lucoenergia/conluz-web.git
cd conluz-web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
export CONLUZ_API_URL=http://localhost:8443
```

### Development

To run the project for development with hot-reloading:

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test            # Run tests
npm run generate-client  # Regenerate API client from OpenAPI spec
```

## 🐳 Docker Deployment

### Using Docker Compose

Prerequisites: Docker and Docker Compose must be installed on your system.

Run the application using Docker Compose:

```bash
cd docker
docker compose up -d
```

The application will be available at `http://localhost:3001`

### Building Local Docker Image

You can configure the `docker-compose.yml` file to use a locally built image:

```yaml
build:
  context: ..
  dockerfile: docker/Dockerfile
```

### Using GitHub Container Registry Image

A new Docker image (`ghcr.io/lucoenergia/conluz-web:latest`) is automatically built and published to GitHub Container Registry whenever code is pushed to the `main` branch.

To use the pre-built image:

1. **Login to GitHub Container Registry** (if the image is private):
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
```
- `GITHUB_TOKEN`: A [personal access token](https://github.com/settings/tokens) with `read:packages` scope
- `GITHUB_USERNAME`: Your GitHub username

2. **Pull and run the image**:
```bash
docker compose pull
docker compose up -d
```

## 🔄 API Client Generation

The models and methods to interact with the backend API are auto-generated from the OpenAPI specification using [Orval](https://orval.dev/).

### Updating API Definitions

1. **Get the latest OpenAPI spec** from the backend:
   - Download from Swagger UI of a running backend instance
   - Save as `api-docs.json` in the project root

2. **Regenerate the API client**:
```bash
npm run generate-client
```

This will update all TypeScript interfaces, models, and API methods in the `src/api/` directory.

## 🔑 Environment Variables

There is currently only one environment variable that can be configured:
```
CONLUZ_API_URL
```
This variable configures the URL of the backend to which the requests will be sent.

If new variables were to be included they must start with **CONLUZ_** in order to be recognized by the vite build system. Furthermore, they must be included in the *Dockerfile* like this:
```Dockerfile
ARG CONLUZ_<VARIABLE_NAME>="CONLUZ_<VARIABLE_NAME>"
```
In order to be hotswaped at the container startup. Further reading of the method used can be found [here](https://web.archive.org/web/20250922053729/https://dev.to/dutchskull/setting-up-dynamic-environment-variables-with-vite-and-docker-5cmj)

## 🏛 Architecture Notes

- **API Generation**: Models and API methods are auto-generated from the backend's OpenAPI specification (`api-docs.json`) using Orval
- **State Management**:
  - Global state managed through React Context (AuthContext, LoggedUserContext)
  - Server state managed with TanStack React Query for caching and synchronization
- **Authentication**: Token-based authentication with automatic token persistence and refresh
- **Error Handling**:
  - Global error boundaries for React component errors
  - Query error handling with automatic 401 response handling
- **Styling Strategy**: MUI-only — the theme in `src/theme/` is the single source of truth for all design tokens (colours, radii, shadows, typography). See `docs/styling-conventions.md` for authoring rules.
- **Code Splitting**: Manual chunks configuration in Vite for optimized bundle sizes
- **Testing Strategy**: Component testing with Vitest and React Testing Library, MSW for API mocking
- **Type Safety**: Full TypeScript coverage with auto-generated types from OpenAPI spec

## 🧪 Testing

The project includes unit tests for critical components. Run tests with:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test -- --watch
```

## 📦 Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🤝 Contributing

Please read [CONTRIBUTE.md](CONTRIBUTE.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the terms described in the [LICENSE](LICENSE) file.
