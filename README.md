# WriteNow - The Machine

A full-stack social writing platform built with Next.js. Users can write, share their work, discover writing prompts, connect with other writers, and set writing goals.

## Features

- **User Authentication**: Secure sign-up, login, and profile management
- **Rich Text Editor**: Write entries with Lexical, a modern rich-text editing framework
- **Social Network**: Connect with friends, send and receive friend requests
- **Library**: Organize and browse your personal collection of writing entries
- **Exploration**: Discover writing from the community
- **Writing Prompts**: Get random writing prompts for inspiration
- **User Search**: Find and connect with other writers
- **User Profiles**: View profiles, manage preferences, and track writing goals
- **Writing Goals**: Set personal writing targets and track streaks

## Technical Stack

### Frontend
- **Next.js 16.2.3** - React framework with App Router
- **React 19.2.4** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **Lexical 0.44.0** - Rich text editor library

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **Prisma 7.7.0** - ORM for database management
- **PostgreSQL** - Database
- **Clerk (`@clerk/nextjs`)** - Hosted authentication and session management

### Development Tools
- **ESLint 9** - Code linting
- **Node.js 20.9+** - Runtime required by Next.js 16

## Authentication Model

Clerk owns identity, sign-in, sign-up, and browser session state. The application still owns its local `User` table and uses local `User.id` for entries, goals, friendships, profile settings, likes, comments, and every other app record.

`User.clerkId` links a Clerk identity to the local app user. Auth-specific implementation details are isolated behind local helpers and wrapper components so Clerk can be swapped for another provider later without rewriting the rest of the app.

Pre-Clerk accounts continue to work through verified email linking. On the first Clerk-authenticated request, the app looks for an existing local user with a verified matching Clerk email. If the local row has no `clerkId`, it is linked to the Clerk user and all existing writing data stays attached to the same local `User.id`. Accounts already linked to another Clerk ID are not silently reassigned.

## Prerequisites

To run this project, you need:

- **Node.js** 20.9 or higher
- **npm** or **yarn** (Node package manager)
- **PostgreSQL** 12.x or higher
- A running PostgreSQL database instance
- A Clerk application with publishable and secret keys

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd the-machine
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/getwrite"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/register"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
```

### 3. Database Setup

Run Prisma migrations to set up the database schema:

```bash
npm run db:migrate
```

(Optional) Seed the database with sample data:

```bash
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality
- `npm run db:migrate` - Run pending Prisma migrations
- `npm run db:seed` - Seed the database with initial data

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `app/components/` - React components
- `lib/` - Utility functions and helpers
- `prisma/` - Database schema and migrations
- `public/` - Static assets

## Notes

- This project uses the latest Next.js 16 with breaking changes. See `AGENTS.md` for important information.
- Database migrations are automatically applied on build via the postinstall hook.
