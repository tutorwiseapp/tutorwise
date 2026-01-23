# VSCode Configuration

**Last Updated**: 2026-01-23
**Version**: 2.0

This folder contains VSCode workspace configuration for the Tutorwise project.

## Files

### `settings.json`
Workspace-specific settings for the Tutorwise Next.js project:
- **TypeScript**: Uses local TypeScript installation from node_modules
- **Formatting**: Prettier on save with ESLint auto-fix
- **Tailwind CSS**: IntelliSense for Tailwind classes with CVA and cx patterns
- **Theme**: Custom chat colors for AI assistant interactions

### `tasks.json`
Pre-configured build tasks for common development workflows:
- **Dev Server** (Ctrl+Shift+D): Start Next.js development server
- **Build** (Ctrl+Shift+B): Build production bundle
- **Run Tests** (Ctrl+Shift+T): Execute test suite
- **Lint**: Run ESLint on codebase

### `keybindings.json`
Custom keyboard shortcuts for development tasks:
- `Ctrl+Shift+D` - Start dev server
- `Ctrl+Shift+B` - Build project
- `Ctrl+Shift+T` - Run tests

## Tech Stack

This configuration is optimized for:
- **Frontend**: Next.js 15, React 18, TypeScript 5
- **Styling**: TailwindCSS with CVA (class-variance-authority)
- **Testing**: Jest, Playwright
- **Code Quality**: ESLint, Prettier

## Recommended Extensions

Install these VSCode extensions for the best development experience:

### Essential
- **ESLint** (dbaeumer.vscode-eslint) - JavaScript/TypeScript linting
- **Prettier** (esbenp.prettier-vscode) - Code formatting
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss) - Tailwind class autocomplete

### Recommended
- **TypeScript Importer** (pmneo.tsimporter) - Auto-import TypeScript definitions
- **Path Intellisense** (christian-kohler.path-intellisense) - File path autocomplete
- **GitLens** (eamodio.gitlens) - Enhanced Git capabilities
- **Error Lens** (usernamehw.errorlens) - Inline error/warning display

## Version Control

- `settings.json` - Tracked in git (team-wide settings)
- `tasks.json` - Tracked in git (common development tasks)
- `keybindings.json` - Tracked in git (recommended shortcuts)
- `*.code-workspace` - Gitignored (personal workspace files)

## Customization

To add personal settings without affecting the team:
1. Use User Settings (Cmd+,) instead of Workspace Settings
2. Create a `.code-workspace` file for multi-root workspace customization
3. Install extensions locally without requiring them for the team

---

**Version 2.0 Changes** (2026-01-23):
- ✅ Removed outdated Python/Gemini CLI references
- ✅ Updated tasks for Next.js development workflow
- ✅ Added Tailwind CSS IntelliSense configuration
- ✅ Updated keybindings for current dev tasks
- ✅ Added TypeScript path configuration
