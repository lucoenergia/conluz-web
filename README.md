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

- Node.js 22 (see `.nvmrc`)
- npm 10 (`>=10.9.0 <11`), enforced by `engine-strict` — see [Prerequisites in CONTRIBUTE.md](CONTRIBUTE.md#prerequisites)

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

Every push to `main` creates a new version automatically:

1. `.github/workflows/version-update.yml` bumps the patch number of the latest `X.Y.Z` git tag (e.g. `1.0.11` → `1.0.12`) and pushes the new tag. Nothing is committed to `main`; the git tag is the single source of truth for the version (`package.json`'s `version` is not used).
2. `.github/workflows/build-and-push-image.yml` builds that tag and publishes it to GitHub Container Registry as:
   - `ghcr.io/lucoenergia/conluz-web:1.0.12` (exact version, recommended for deployments)
   - `ghcr.io/lucoenergia/conluz-web:1.0` and `:1` (moving major/minor tags)
   - `ghcr.io/lucoenergia/conluz-web:latest`
3. The same run publishes a GitHub Release for the tag, with notes generated from the pull requests merged since the previous tag and grouped by PR label (see [Release notes](CONTRIBUTE.md#release-notes)).

The version is also baked into the app (shown at the bottom of the side menu) and into the image's `org.opencontainers.image.version` / `org.opencontainers.image.revision` labels, so a running container can always be traced back to its tag and commit. Local builds show `dev`.

To bump the minor or major version, push a tag manually on `main` (e.g. `git tag 1.1.0 && git push origin 1.1.0`); this publishes `1.1.0`, and the next merge continues from it (`1.1.1`).

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
- **Code Splitting**: Rollup's automatic chunking — `vite.config.ts` deliberately sets no `manualChunks`, because automatic chunking kept the initial critical path smaller than every hand-rolled rule tried
- **Testing Strategy**: Component testing with Vitest and React Testing Library, with API hooks mocked via `vi.mock` of the generated `src/api/<tag>/<tag>` modules
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

## 🎨 Design System (Claude Design)

The app's presentational components are published as a design system in
[Claude Design](https://claude.ai/design), in the **Conluz Web** project
(`https://claude.ai/design/p/0f2a485c-16f2-40a0-8daa-f60d47528106`; access depends on your
claude.ai organisation). Designs and prototypes made there use the real components, the MUI theme,
Inter and the Spanish copy, so what a designer builds maps one-to-one onto code we can ship.

It is **not a Storybook**. It is generated by the `/design-sync` skill of
[Claude Code](https://claude.com/claude-code) from the inputs committed under `.design-sync/`:

| Path | What it is |
|---|---|
| `.design-sync/pkg/` | Entry package: re-exports the 93 synced components, `ConluzProvider` (theme, Spanish locale, in-memory router, inert community context), the themed MUI primitives (`Mui.*`), the icons (`Icons.*`) and the theme tokens |
| `.design-sync/previews/` | One preview per component (each named export is one variant shown on the card) |
| `.design-sync/config.json` | Sync configuration: target project, component groups, card layout |
| `.design-sync/conventions.md` | Guide for the Claude Design agent on how to build with these components |
| `.design-sync/NOTES.md` | Repo-specific gotchas, re-sync risks and the manual re-sync steps |

Under the hood, esbuild bundles the entry into a single browser script (`window.ConluzWeb`),
the TypeScript compiler extracts each component's props, each preview is compiled into a static
HTML card, and Playwright with headless Chromium checks that every card renders. Components that
fetch data, mutate data, or need the signed-in user are not synced; `NOTES.md` lists them.

### Running the design system locally

The generated design system is a folder of static files, `ds-bundle/`, that is **gitignored**, so a
fresh clone does not have it. The converter scripts that produce it come with Claude Code's
`/design-sync` skill and are not part of this repository.

1. **Install the app's dependencies** (see [Installation](#installation)):
   ```bash
   npm install
   ```

2. **Generate `ds-bundle/`** by running the skill from the repository root in Claude Code:
   ```
   /design-sync
   ```
   It reads `.design-sync/config.json` and rebuilds, validates and screenshots every component.
   Before uploading anything it asks for your approval; decline it if you only want the local copy.
   The commands it runs are listed in the "Re-sync quickstart" of `.design-sync/NOTES.md`.

3. **Serve the folder** with any static file server:
   ```bash
   npx serve ds-bundle
   ```
   Open the cards through the server, not as `file://` URLs, because they load their scripts by
   relative path. (`serve` drops the `.html` extension from URLs; both forms work.)

4. **Browse it**:
   - `http://localhost:3000/.review.html`: every component card on one page, grouped (the closest
     thing to a Storybook overview).
   - `http://localhost:3000/components/<group>/<Name>/<Name>.html`: a single component, for example
     `/components/supplies-and-plants/SupplyCard/SupplyCard.html`.
   - Each component folder also holds `<Name>.d.ts` (its props) and `<Name>.prompt.md` (its usage
     notes).

`npx serve` prints the port it uses; adjust the URLs if it is not 3000.

### Keeping it up to date

- After changing a synced component, run `/design-sync` again. It rebuilds, re-checks only the
  components that changed, and uploads the result to the Claude Design project.
- A **new** component is not synced automatically: export it from `.design-sync/pkg/index.ts`, add it
  to a group under `docsMap` in `.design-sync/config.json`, and write its preview in
  `.design-sync/previews/<Name>.tsx`.
- Preview files import a virtual `conluz-web` package, so ESLint ignores `.design-sync/`, `.ds-sync/`
  and `ds-bundle/`. Check them with the TypeScript compiler instead:
  ```bash
  npx tsc -p .design-sync/pkg/tsconfig.json        # the entry package resolves every export
  npx tsc -p .design-sync/previews/tsconfig.json   # every preview matches the real props
  ```
- AI coding agents follow the rules in `AGENTS.md` ("Design system (Claude Design)") and the
  `conluz-web-design-system` skill.

## 🤝 Contributing

Please read [CONTRIBUTE.md](CONTRIBUTE.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the terms described in the [LICENSE](LICENSE) file.
