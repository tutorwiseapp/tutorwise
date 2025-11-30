/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubPageLayout.tsx
 * Purpose: Standard Hub Page Layout matching Bookings page structure
 * Created: 2025-11-28
 * Updated: 2025-11-30 - Added comprehensive migration checklist
 * Pattern: Header + Tabs (full-width) + Content (container) + Sidebar
 *
 * Layout Structure:
 * - Header: Title + optional filters + Actions (from HubHeader)
 * - Tabs: Full-width underline tabs (Bookings style)
 * - Content: Max-width container (1200px) with listings
 * - Sidebar: Fixed-width right column (320px) with widgets
 *
 * ============================================================================
 * COMPLETE MIGRATION CHECKLIST - USE THIS EVERY TIME!
 * ============================================================================
 *
 * STEP 1: IMPORTS (Add these imports)
 * ✓ import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/ui/hub-layout';
 * ✓ import type { HubTab } from '@/app/components/ui/hub-layout';
 * ✓ import Button from '@/app/components/ui/Button';
 * ✓ import filterStyles from '@/app/components/ui/hub-layout/hub-filters.module.css';
 * ✓ import actionStyles from '@/app/components/ui/hub-layout/hub-actions.module.css';
 *
 * STEP 2: STATE (Add these state variables)
 * ✓ const [searchQuery, setSearchQuery] = useState('');
 * ✓ const [sortBy, setSortBy] = useState<SortType>('newest');
 * ✓ const [currentPage, setCurrentPage] = useState(1);
 * ✓ const [showActionsMenu, setShowActionsMenu] = useState(false);
 * ✓ const ITEMS_PER_PAGE = 10; // or appropriate number for your page
 *
 * STEP 3: FILTERING & PAGINATION LOGIC
 * ✓ Add search filtering logic in useMemo for filteredItems
 * ✓ Add sorting logic in useMemo for filteredItems
 * ✓ Add pagination slicing: const paginatedItems = filteredItems.slice(startIndex, endIndex);
 * ✓ Add useEffect to reset currentPage when filter changes
 *
 * STEP 4: HubHeader CONFIGURATION (NEVER SKIP THIS!)
 * ✓ Add filters prop with search input and sort dropdown:
 *     filters={
 *       <div className={filterStyles.filtersContainer}>
 *         <input
 *           type="search"
 *           placeholder="Search..."
 *           value={searchQuery}
 *           onChange={(e) => setSearchQuery(e.target.value)}
 *           className={filterStyles.searchInput}
 *         />
 *         <select
 *           value={sortBy}
 *           onChange={(e) => setSortBy(e.target.value as SortType)}
 *           className={filterStyles.filterSelect}
 *         >
 *           <option value="newest">Newest First</option>
 *           <option value="oldest">Oldest First</option>
 *           <option value="name-asc">Name (A-Z)</option>
 *           <option value="name-desc">Name (Z-A)</option>
 *         </select>
 *       </div>
 *     }
 * ✓ Add actions prop with primary button and secondary dropdown menu
 *
 * STEP 5: HubTabs CONFIGURATION (If page has tabs)
 * ✓ Create tabs array with HubTab[] type
 * ✓ Pass tabs to HubTabs component with onTabChange handler
 *
 * STEP 6: HubPagination (CRITICAL - NEVER SKIP THIS!)
 * ✓ Add after the list/content, INSIDE the conditional for non-empty content:
 *     <HubPagination
 *       currentPage={currentPage}
 *       totalItems={totalItems}
 *       itemsPerPage={ITEMS_PER_PAGE}
 *       onPageChange={setCurrentPage}
 *     />
 * ✓ Use paginatedItems (NOT filteredItems) in map function
 *
 * STEP 7: CSS CLEANUP
 * ✓ Remove obsolete header styles (.header, .title, .subtitle)
 * ✓ Remove obsolete tab styles (.filterTabs, .filterTab, .filterTabActive)
 * ✓ Update empty state: border: 1px solid #e5e7eb, background-color: #ffffff
 * ✓ Add comment about legacy styles being removed
 *
 * ============================================================================
 * COMPLETE EXAMPLE (Network page pattern):
 * ============================================================================
 *
 * <HubPageLayout
 *   header={
 *     <HubHeader
 *       title="Page Title"
 *       filters={
 *         <div className={filterStyles.filtersContainer}>
 *           <input
 *             type="search"
 *             placeholder="Search..."
 *             value={searchQuery}
 *             onChange={(e) => setSearchQuery(e.target.value)}
 *             className={filterStyles.searchInput}
 *           />
 *           <select
 *             value={sortBy}
 *             onChange={(e) => setSortBy(e.target.value as SortType)}
 *             className={filterStyles.filterSelect}
 *           >
 *             <option value="newest">Newest First</option>
 *             <option value="oldest">Oldest First</option>
 *           </select>
 *         </div>
 *       }
 *       actions={
 *         <>
 *           <Button variant="primary" size="sm" onClick={handlePrimaryAction}>
 *             Primary Action
 *           </Button>
 *           <div className={actionStyles.dropdownContainer}>
 *             <Button variant="secondary" size="sm" onClick={() => setShowActionsMenu(!showActionsMenu)}>
 *               ⋮
 *             </Button>
 *             {showActionsMenu && (
 *               <>
 *                 <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
 *                 <div className={actionStyles.dropdownMenu}>
 *                   <button onClick={handleAction1} className={actionStyles.menuButton}>
 *                     Action 1
 *                   </button>
 *                 </div>
 *               </>
 *             )}
 *           </div>
 *         </>
 *       }
 *     />
 *   }
 *   tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
 *   sidebar={<ContextualSidebar>...</ContextualSidebar>}
 * >
 *   {/* Empty state */}
 *   {filteredItems.length === 0 && <EmptyState />}
 *
 *   {/* List with pagination */}
 *   {filteredItems.length > 0 && (
 *     <>
 *       <div className={styles.itemsList}>
 *         {paginatedItems.map(item => <ItemCard key={item.id} item={item} />)}
 *       </div>
 *       <HubPagination
 *         currentPage={currentPage}
 *         totalItems={totalItems}
 *         itemsPerPage={ITEMS_PER_PAGE}
 *         onPageChange={setCurrentPage}
 *       />
 *     </>
 *   )}
 * </HubPageLayout>
 *
 * ============================================================================
 * REFERENCE IMPLEMENTATIONS:
 * - /Users/michaelquan/projects/tutorwise/apps/web/src/app/(authenticated)/network/page.tsx (GOLD STANDARD)
 * - /Users/michaelquan/projects/tutorwise/apps/web/src/app/(authenticated)/reviews/page.tsx
 * - /Users/michaelquan/projects/tutorwise/apps/web/src/app/(authenticated)/organisation/page.tsx
 * ============================================================================
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './HubPageLayout.module.css';

interface HubPageLayoutProps {
  header: ReactNode; // HubHeader component
  tabs?: ReactNode; // Optional tab navigation
  children: ReactNode; // Content area (cards, lists, etc.)
  sidebar?: ReactNode; // Optional right contextual column
}

export default function HubPageLayout({
  header,
  tabs,
  children,
  sidebar,
}: HubPageLayoutProps) {
  return (
    <>
      {/* Header (full-width) */}
      {header}

      {/* Tabs (full-width) */}
      {tabs}

      {/* Main Layout: Content + Sidebar */}
      <div className={styles.mainLayout}>
        {/* Content Column */}
        <main className={styles.contentColumn}>
          {children}
        </main>

        {/* Right Sidebar */}
        {sidebar}
      </div>
    </>
  );
}
