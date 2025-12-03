/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// CONFIGURATION
const TARGET_DIR = './apps/web/src'; 
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.module.css'];

// 1. COMPONENT RENAMING
const COMPONENT_REPLACEMENTS = [
  { from: 'ContextualSidebar', to: 'HubSidebar' },
  { from: 'SidebarStatsWidget', to: 'HubStatsCard' },
  { from: 'SidebarActionWidget', to: 'HubActionCard' },
  { from: 'SidebarQuickActionsWidget', to: 'HubQuickActionsCard' },
  { from: 'SidebarComplexWidget', to: 'HubComplexCard' },
];

// 2. IMPORT PATH MAPPINGS
// Order matters! Specific paths must come before general paths.
const PATH_REPLACEMENTS = [
  // --- UI: Actions ---
  { from: '@/app/components/ui/Button', to: '@/app/components/ui/actions/Button' },

  // --- UI: Branding ---
  { from: '@/app/components/shared/Logo', to: '@/app/components/ui/branding/Logo' },

  // --- UI: Data Display ---
  { from: '@/app/components/ui/Card', to: '@/app/components/ui/data-display/Card' },
  { from: '@/app/components/ui/Chip', to: '@/app/components/ui/data-display/Chip' },
  { from: '@/app/components/ui/StatusBadge', to: '@/app/components/ui/data-display/StatusBadge' },
  { from: '@/app/components/ui/PageHeader', to: '@/app/components/ui/data-display/PageHeader' },
  { from: '@/app/components/ui/reports/StatCard', to: '@/app/components/ui/data-display/StatCard' },
  { from: '@/app/components/ui/reports/StatGrid', to: '@/app/components/ui/data-display/StatGrid' },
  { from: '@/app/components/ui/table/DataTable', to: '@/app/components/ui/data-display/DataTable' },

  // --- UI: Feedback ---
  { from: '@/app/components/ui/Modal', to: '@/app/components/ui/feedback/Modal' },
  { from: '@/app/components/modals/VideoModal', to: '@/app/components/ui/feedback/VideoModal' },
  { from: '@/app/components/ui/ConfirmDialog', to: '@/app/components/ui/feedback/ConfirmDialog' },
  { from: '@/app/components/ui/Message', to: '@/app/components/ui/feedback/Message' },
  { from: '@/app/components/ErrorBoundary', to: '@/app/components/ui/feedback/ErrorBoundary' },

  // --- UI: Forms ---
  { from: '@/app/components/ui/form', to: '@/app/components/ui/forms' },
  { from: '@/app/components/ui/picker/DatePicker', to: '@/app/components/ui/forms/DatePicker' },
  { from: '@/app/components/ui/picker/TimePicker', to: '@/app/components/ui/forms/TimePicker' },

  // --- UI: Navigation ---
  { from: '@/app/components/ui/Tabs', to: '@/app/components/ui/navigation/Tabs' },
  { from: '@/app/components/ui/nav/Breadcrumb', to: '@/app/components/ui/navigation/Breadcrumb' },
  { from: '@/app/components/ui/nav/NavLink', to: '@/app/components/ui/navigation/NavLink' },
  { from: '@/app/components/ui/nav/GuanMenuIcon', to: '@/app/components/ui/navigation/GuanMenuIcon' },

  // --- Hub Architecture ---
  { from: '@/app/components/ui/hub-layout', to: '@/app/components/hub/layout' },
  { from: '@/app/components/ui/hub-row-card', to: '@/app/components/hub/content/HubRowCard' },
  { from: '@/app/components/ui/hub-form', to: '@/app/components/hub/form' },
  
  // --- Sidebar Architecture ---
  { from: '@/app/components/layout/sidebars/ContextualSidebar', to: '@/app/components/hub/sidebar/HubSidebar' },
  { from: '@/app/components/layout/sidebars/components/SidebarStatsWidget', to: '@/app/components/hub/sidebar/cards/HubStatsCard' },
  { from: '@/app/components/layout/sidebars/components/SidebarActionWidget', to: '@/app/components/hub/sidebar/cards/HubActionCard' },
  { from: '@/app/components/layout/sidebars/components/SidebarQuickActionsWidget', to: '@/app/components/hub/sidebar/cards/HubQuickActionsCard' },
  { from: '@/app/components/layout/sidebars/components/SidebarComplexWidget', to: '@/app/components/hub/sidebar/cards/HubComplexCard' },
  
  // --- Global Layout ---
  { from: '@/app/components/layout/sidebars/AppSidebar', to: '@/app/components/layout/AppSidebar' },

  // --- Features (catch-all for moved feature folders) ---
  { from: '@/app/components/account', to: '@/app/components/feature/account' },
  { from: '@/app/components/auth', to: '@/app/components/feature/auth' },
  { from: '@/app/components/bookings', to: '@/app/components/feature/bookings' },
  { from: '@/app/components/caas', to: '@/app/components/feature/caas' },
  { from: '@/app/components/dashboard', to: '@/app/components/feature/dashboard' },
  { from: '@/app/components/financials', to: '@/app/components/feature/financials' },
  { from: '@/app/components/listings', to: '@/app/components/feature/listings' },
  { from: '@/app/components/marketplace', to: '@/app/components/feature/marketplace' },
  { from: '@/app/components/messages', to: '@/app/components/feature/messages' },
  { from: '@/app/components/network', to: '@/app/components/feature/network' },
  { from: '@/app/components/onboarding', to: '@/app/components/feature/onboarding' },
  { from: '@/app/components/organisation', to: '@/app/components/feature/organisation' },
  { from: '@/app/components/payments', to: '@/app/components/feature/payments' },
  { from: '@/app/components/profile', to: '@/app/components/feature/profile' },
  { from: '@/app/components/public-profile', to: '@/app/components/feature/public-profile' },
  { from: '@/app/components/referrals', to: '@/app/components/feature/referrals' },
  { from: '@/app/components/reviews', to: '@/app/components/feature/reviews' },
  { from: '@/app/components/students', to: '@/app/components/feature/students' },
  { from: '@/app/components/wiselists', to: '@/app/components/feature/wiselists' },
  { from: '@/app/components/wisespace', to: '@/app/components/feature/wisespace' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

function updateFile(filePath) {
  if (!EXTENSIONS.includes(path.extname(filePath))) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Update Paths
  PATH_REPLACEMENTS.forEach(({ from, to }) => {
    // Matches: import ... from "FROM" or "FROM/subpath"
    const regex = new RegExp(`(from ['"]|import ['"]|require\\(['"])${from}(['"/])`, 'g');
    content = content.replace(regex, `$1${to}$2`);
  });

  // 2. Update Component Names
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    COMPONENT_REPLACEMENTS.forEach(({ from, to }) => {
      const regex = new RegExp(`\\b${from}\\b`, 'g');
      content = content.replace(regex, to);
    });
  }

  if (content !== originalContent) {
    console.log(`Updated: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log('🚀 Starting comprehensive import migration...');
if (fs.existsSync(TARGET_DIR)) {
  walkDir(TARGET_DIR, updateFile);
  console.log('✅ Migration complete.');
} else {
  console.error(`❌ Target directory not found: ${TARGET_DIR}`);
}