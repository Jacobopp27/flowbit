# Flowbit Frontend

Production-ready SaaS dashboard for Flowbit Operations OS.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (Radix UI components)
- React Router
- lucide-react icons

## Getting Started

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── layout/          # Layout components (Sidebar, TopBar)
├── layouts/
│   └── AppShell.tsx     # Main app layout wrapper
├── pages/
│   ├── admin/           # Admin/Boss pages
│   └── worker/          # Worker pages
├── lib/
│   └── utils.ts         # Utility functions
├── App.tsx              # Router configuration
├── main.tsx             # App entry point
└── index.css            # Global styles + Tailwind

```

## Features

- **Role-based navigation**: Sidebar adapts based on user role (ADMIN/WORKER)
- **Responsive layout**: Desktop sidebar, mobile drawer
- **Professional UI**: Built with shadcn/ui components
- **Type-safe routing**: React Router with TypeScript
- **Production-ready**: Following B2B SaaS design patterns

## Routes

### Admin Routes
- `/admin/dashboard` - Dashboard overview
- `/admin/projects` - Projects list
- `/admin/projects/new` - Create new project
- `/admin/projects/:id` - Project detail
- `/admin/stages` - Workflow stages configuration
- `/admin/users` - User management
- `/admin/materials` - Materials catalog
- `/admin/products` - Products and BOM

### Worker Routes
- `/work` - My assigned stages
- `/work/:projectStageId` - Stage work detail

## Development Notes

- Role is currently hardcoded in `App.tsx` as `'ADMIN'`
- No backend integration yet (placeholder data)
- Finance sections are hidden from workers as per specs
- All pages use Card components (no raw div layouts)
- No inline styles (Tailwind + shadcn/ui only)
