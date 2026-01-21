# Tutorwise Project Overview

This repository is a monorepo for the Tutorwise educational platform. It contains a web application, a Python API, and a sophisticated automation system for remote task execution.

## Project Structure

The repository is structured as a monorepo using npm workspaces. The main components are:

-   `apps/web`: A Next.js application that serves as the frontend for the platform.
-   `apps/api`: A Python API that serves as the backend.
-   `packages/*`: Shared packages used by the web and API applications.
-   `cas/*`: A Central Authentication Service (CAS) for managing authentication and authorization.
-   `tools/*`: A collection of scripts and tools for automating development tasks.

## Building and Running

### Development

To run the web application and API in development mode, use the following command:

```bash
npm run dev
```

This will start the Next.js development server for the web application and the Uvicorn server for the Python API.

### Testing

The repository contains a comprehensive test suite that includes unit, integration, and end-to-end tests. To run all tests, use the following command:

```bash
npm run test
```

You can also run specific types of tests:

-   `npm run test:unit`: Runs unit tests.
-   `npm run test:integration`: Runs integration tests.
-   `npm run test:e2e`: Runs end-to-end tests.
-   `npm run test:backend`: Runs backend tests.

## Development Conventions

The repository has a set of development conventions that are enforced through linting and type checking. To run the linter and type checker, use the following commands:

-   `npm run lint`: Runs the linter.
-   `npm run typecheck`: Runs the type checker.

## Remote Task Execution

A core feature of this repository is the ability to execute tasks remotely using Jira and Google Calendar. This allows developers to automate a wide range of development tasks, such as creating files, installing packages, and running commands.

For more information on how to use the remote task execution system, see the [Tutorwise Quick Start Guide](docs/development/quick-start-guide.md).
