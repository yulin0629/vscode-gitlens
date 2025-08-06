# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

### Development
- **Build**: `pnpm run build` - Quick development build
- **Watch**: `pnpm run watch` - Continuous build during development
- **Rebuild**: `pnpm run rebuild` - Complete rebuild from scratch
- **Bundle**: `pnpm run bundle` - Production bundle
- **Package**: `pnpm run package` - Generate VSIX installation package

### Code Quality
- **Lint**: `pnpm run lint` - Run ESLint
- **Format**: `pnpm run pretty` - Format code with Prettier
- **Clean**: `pnpm run clean` - Remove build artifacts

### Testing
- **Unit Tests**: `pnpm test` - Run unit tests with VS Code test runner
- **Build Tests**: `pnpm run build:tests` - Build test files
- **Single Test**: Use VS Code test explorer or debug configuration

## High-Level Architecture

### Core Structure
GitLens is a VS Code extension that enhances Git functionality. The codebase is organized into:

1. **Extension Entry** (`src/extension.ts`): Main entry point that initializes the extension
2. **Container** (`src/container.ts`): Central dependency injection container managing all services
3. **Dual Platform Support**: Code is split between Node.js (`src/env/node/`) and browser (`src/env/browser/`) for desktop and web VS Code support

### Key Services & Components

#### Git Integration (`src/git/`)
- **GitProviderService**: Manages multiple Git providers (local, GitHub, VS Live Share)
- **LocalGitProvider** (`src/env/node/git/localGitProvider.ts`): Primary Git implementation using Git CLI
- **Models** (`src/git/models/`): Type-safe representations of Git objects (commits, branches, etc.)
- **Parsers** (`src/git/parsers/`): Parse Git command outputs into models

#### UI Components
- **Views** (`src/views/`): Tree views in VS Code sidebar (Commits, Branches, Stashes, etc.)
- **Webviews** (`src/webviews/`): Rich HTML-based views (Graph, Settings, Rebase Editor)
- **Annotations** (`src/annotations/`): In-editor blame and changes annotations
- **CodeLens** (`src/codelens/`): Inline code authorship information

#### Plus Features (`src/plus/`)
- **AI Integration** (`src/plus/ai/`): Multiple AI provider support for commit messages, explanations
- **Cloud Services** (`src/plus/gk/`): GitKraken account integration and subscription management
- **Integrations** (`src/plus/integrations/`): GitHub, GitLab, Bitbucket, Jira connections
- **Launchpad** (`src/plus/launchpad/`): PR management and review features

### Command System
- **Commands** (`src/commands/`): All VS Code commands, organized by feature
- **Quick Commands** (`src/commands/git/`): Interactive Git command palette
- **Command Context** (`src/commands/commandContext.ts`): Context management for conditional command availability

### Data Flow
1. Git operations flow through GitProviderService → specific provider → Git CLI/API
2. Results are parsed into models and cached for performance
3. Views/webviews subscribe to changes via event bus
4. UI updates reflect Git state changes automatically

### Key Patterns
- **Lazy Loading**: Features load on-demand to improve startup performance
- **Caching**: Aggressive caching with invalidation on Git operations
- **Decorators**: Used extensively for logging, memoization, and command registration
- **IPC**: Webviews communicate with extension host via structured protocol

## Development Tips

### Debugging
- Use "Watch & Run" launch configuration for desktop development
- Webviews can be refreshed without restarting the extension
- Enable trace logging via GitLens settings for detailed diagnostics

### Working with Webviews
- Webview source in `src/webviews/apps/`
- Built separately with webpack
- Use webview developer tools for debugging

### Performance Considerations
- Git operations are expensive - always check cache first
- Use debouncing for file system watchers
- Minimize VS Code API calls in hot paths

## Important Files
- `contributions.json`: Command and configuration contributions (generated into package.json)
- `webpack.config.mjs`: Build configuration for extension and webviews
- `.vscode-test.mjs`: Test runner configuration