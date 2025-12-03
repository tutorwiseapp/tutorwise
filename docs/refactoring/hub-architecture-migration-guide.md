Hub Architecture Migration Guide

This guide outlines the specific steps to execute the "Big Rename" and structural reorganization of the apps/web frontend to adhere to the new Atomic Design & Hub Architecture.

Related Documents:

Strategy & Architecture

⚠️ Pre-Requisites

Clean Working Directory: Ensure you have no uncommitted changes.

git status


Create a Branch: Do not run this on main directly.

git checkout -b refactor/hub-architecture-atomic-ui


Verify Scripts: Ensure the following two scripts are present in your project root:

hub-migration-move-files.sh (The physical file mover)

hub-file-reorganisation-rename.js (The code-mod for imports)

🚀 Phase 1: Physical File Migration

This step uses the shell script to create the new folder structure (ui/actions, hub/layout, feature/bookings, etc.) and move the files on the disk.

Make the script executable:

chmod +x hub-migration-move-files.sh


Execute the move:

./hub-migration-move-files.sh


Validation:

Check apps/web/src/app/components/ui/. You should see folders like actions, branding, forms.

Check apps/web/src/app/components/hub/sidebar/cards. You should see files like HubStatsCard.tsx (renamed from SidebarStatsWidget).

Check apps/web/src/app/components/layout/sidebars. This folder should be largely empty or gone.

🔄 Phase 2: Update Imports (Codemod)

Now that files have moved, imports throughout the application will be broken. We run the Node.js script to fix paths and rename component usages in JSX.

Run the Codemod:

node hub-file-reorganisation-rename.js


What this script does:

Scans apps/web/src.

Updates imports (e.g., import Button from '@/components/ui/Button' -> @/components/ui/actions/Button).

Renames usage (e.g., <ContextualSidebar /> -> <HubSidebar />).

Renames widget usage (e.g., <SidebarStatsWidget /> -> <HubStatsCard />).

✅ Phase 3: Verification & Cleanup

Type Check:
Run the TypeScript compiler to find any edge cases the script might have missed.

npm run typecheck --workspace=@tutorwise/web


Build:
Ensure the project builds successfully.

npm run build --workspace=@tutorwise/web


Manual Spot Check:

Open apps/web/src/app/(authenticated)/layout.tsx: Ensure it imports HubSidebar (formerly ContextualSidebar) correctly from hub/sidebar.

Open a Feature Component (e.g., in feature/bookings): Ensure UI atoms like Button are imported from @/components/ui/actions/Button.

Resolve CSS Modules:
If any .module.css files were moved, verify that their corresponding .tsx files are still importing them correctly. The script attempts to handle this, but manual verification is recommended.

📝 Phase 4: Commit

Once the build passes and you are confident in the structure:

git add .
git commit -m "refactor(web): migrate components to atomic/hub architecture"
git push origin refactor/hub-architecture-atomic-ui

The execution files are:
tutorwise/hub-migration-move-files.sh
tutorwise/hub-file-reorganisation-rename.js
docs/hub-architecture-and-atomic-design-reorganisation.md
docs/hub-architecture-migration-guide

