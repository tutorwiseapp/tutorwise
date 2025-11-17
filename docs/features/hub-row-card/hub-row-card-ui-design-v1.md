# hub-row-card-ui-design-v1

Here is the final, complete **HubRowCard UI Design (v1)**.

This document now includes the missing **Messages**, **My Students**, and **Reviews** variants, and marks **ALL** hub designs as **LOCKED** 🔒 for implementation.

* * *

### **UI Design: HubRowCard Standardization (v1)**

- **Document Name:** `hubrowcard-ui-design-v1.md`
- **Version:** 1.4 (Complete & Locked)
- **Status:** **ALL LOCKED 🔒**
- **Owner:** Senior Architect
- **Prerequisites:** `DESIGN_SYSTEM.md`, `globals.css`

* * *

### 1.0 Executive Summary

This document outlines the UI architecture for the **HubRowCard**, the universal "horizontal list item" used in the main content column for all 9 application hubs.

**The Core Pattern:**

1. **Golden Ratio Column:** A fixed-width image/avatar column on the left (160px).
2. **4-Row Rhythm:** A standardized vertical hierarchy for content (Header, Description, Metadata, Stats).
3. **Action Dock:** A dedicated, bottom-anchored area for primary and secondary actions.

* * *

### 2.0 Visual Specifications (ASCII)

#### 2.1 The Master Pattern

- **Layout:** Horizontal Flex (Image Left, Content Right).
- **Typography:** Title (16px SemiBold), Body (14px Regular), Meta (14px Medium).

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
|                |  Row 1: Header Group                                  |
| [   IMAGE    ] |  [Title: H3 16px]                   [Status Badge]    |
|                |                                                       |
|  Fixed Width   |  Row 2: Description                                   |
|  160px (Desk)  |  [Body: 14px, Grey-600, 1-line truncate]              |
|  120px (Tab)   |                                                       |
|                |  Row 3: Metadata (Bullet Separated)                   |
|                |  [Meta 1]  •  [Meta 2]  •  [Meta 3]                   |
|                |                                                       |
|                |  Row 4: Stats / Context                               |
|                |  [Stat Label]    [Stat Label]                         |
|                |                                                       |
|                |  ---------------------------------------------------  |
|                |  ACTION DOCK (Right Aligned)                          |
|                |                      [ Secondary ]  [ Primary Action ]|
+----------------+-------------------------------------------------------+

```

#### 2.2 Listings (`/listings`) **\[LOCKED 🔒\]**

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ Listing    ] |  A-Level Maths Tutoring             [Badge: Active]   |
| [  Image     ] |  Comprehensive coverage of pure maths and mechanics.  |
|                |  Maths  •  £30/hr  •  Online                          |
|                |  24 Views   3 Inquiries   0 Bookings                  |
|                |  ---------------------------------------------------  |
|                |                                 [ Edit ]  [ Publish ] |
+----------------+-------------------------------------------------------+

```

#### 2.3 Bookings (`/bookings`) **\[LOCKED 🔒\]**

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ User       ] |  A-Level Physics                    [Badge: Paid]     |
| [ Avatar     ] |  Weekly session covering mechanics and thermodynamics.|
|                |  John Smith  •  Online Session  •  12 Aug  •  14:00   |
|                |  £45.00  •  1 hr Duration                             |
|                |  ---------------------------------------------------  |
|                |                       [ Reschedule ]  [ View Details ]|
+----------------+-------------------------------------------------------+

```

#### 2.4 Referrals (`/referrals`) **\[LOCKED 🔒\]**

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ User       ] |  Referral: Mike Ross                [Badge: Converted]|
| [ Avatar     ] |  Referred via "Summer Math Camp" Campaign             |
|                |  Signed Up: 12 Aug  •  First Booking: 15 Aug          |
|                |  Earnings: £45.00                                     |
|                |  ---------------------------------------------------  |
|                |                                      [ View Details ] |
+----------------+-------------------------------------------------------+

```

#### 2.5 Network (`/network`) **\[LOCKED 🔒\]**

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ User       ] |  Dr. Sarah Jones                    [Badge: Connected]|
| [ Avatar     ] |  Head of Science at St. Mary's School                 |
|                |  London  •  Education Sector                          |
|                |  12 Mutual Connections                                |
|                |  ---------------------------------------------------  |
|                |                           [ Remove ]  [ Send Message ]|
+----------------+-------------------------------------------------------+

```

#### 2.6 Wiselists (`/wiselists`) **\[LOCKED 🔒\]**

- **List Card:** Used on the Hub page.
- **Item Card:** Used on the Detail page (see 2.10).

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ List       ] |  Top London Tutors                  [Badge: Public]   |
| [ Owner      ] |  My curated list of the best science tutors in LDN.   |
| [ Avatar     ] |  8 Items  •  Updated 2 days ago                       |
|                |  Collaborators: You, Jane, Mark                       |
|                |  ---------------------------------------------------  |
|                |                                     [ Edit ]  [ Share ] |
+----------------+-------------------------------------------------------+

```

#### 2.7 Financials (`/financials`) **\[LOCKED 🔒\]**

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ Transact   ] |  Payout: August Earnings            [Badge: Paid]     |
| [ Icon       ] |  Withdrawal to Barclays Account ****1234              |
|                |  15 Aug 2025  •  ID: #TX-998877                       |
|                |  Amount: £1,250.00                                    |
|                |  ---------------------------------------------------  |
|                |                              [ Support ]  [ Invoice ] |
+----------------+-------------------------------------------------------+

```

#### 2.8 My Students (`/my-students`) **\[LOCKED 🔒\]**

- **Added:** As requested. Displays student progress and parent linkage.

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ Student    ] |  Alex Johnson                       [Badge: Active]   |
| [ Avatar     ] |  Year 11 • Preparing for GCSEs                        |
|                |  Parent: Sarah Johnson  •  School: St. Paul's         |
|                |  12 Sessions Completed                                |
|                |  ---------------------------------------------------  |
|                |                       [ View Progress ]  [ Book Now ] |
+----------------+-------------------------------------------------------+

```

#### 2.9 Reviews (`/reviews`) **\[LOCKED 🔒\]**

- **Added:** As requested. Displays review content and rating.

```
Plaintext
```

```
+----------------+-------------------------------------------------------+
| [ Reviewer   ] |  Review by Emily Blunt              [Badge: 5.0 Stars]|
| [ Avatar     ] |  "Absolutely fantastic tutor, helped me pass..."      |
|                |  Maths Session  •  12 Aug 2025                        |
|                |  Verified Booking                                     |
|                |  ---------------------------------------------------  |
|                |                                [ Report ]  [ Reply ]  |
+----------------+-------------------------------------------------------+

```

#### 2.10 Messages (`/messages`)

tbd

* * *

### 3.0 Variant Catalog (Implementation Table)

|     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- |
| Hub | Data Entity | Image Source | Meta Row Content | Stats/Context Row Content | Action Dock |
| **Listings** | Service | Service Image | `Subject` • `Rate` • `Location` | `Views` • `Inquiries` • `Bookings` | **Primary:** Publish/Unpublish<br><br>**Secondary:** Edit |
| **Bookings** | Session | Partner Avatar | `Client` • `Location` • `Date` • `Time` | `Price` • `Duration` | **Primary:** Pay / Join<br><br>**Secondary:** Reschedule |
| **Network** | Connection | User Avatar | `Job Title` • `Company` | `Mutual Connections` • `Location` | **Primary:** Message<br><br>**Secondary:** Remove |
| **Referrals** | Lead | User Avatar | `Signup Date` • `First Booking` | `Earnings` | **Primary:** N/A<br><br>**Secondary:** View Details |
| **Wiselists** | List | Owner Avatar | `Visibility` • `Created Date` | `Item Count` • `Collaborators` | **Primary:** Share<br><br>**Secondary:** Edit |
| **Financials** | Txn | System Icon | `Date` • `ID` | `Amount` | **Primary:** Invoice<br><br>**Secondary:** Support |
| **Students** | Student | Student Avatar | `Parent` • `School` | `Sessions Completed` | **Primary:** Book<br><br>**Secondary:** Progress |
| **Reviews** | Review | User Avatar | `Service` • `Date` | `Verified Status` | **Primary:** Reply<br><br>**Secondary:** Report |
| **Messages** | Chat | tbd |     |     |     |

Export to Sheets

* * *

### 4.0 Component Architecture

#### 4.1 File Structure

- **Component:** `apps/web/src/app/components/ui/hub/HubRowCard.tsx`
- **Styles:** `apps/web/src/app/components/ui/hub/HubRowCard.module.css`

#### 4.2 Props Interface

```
TypeScript
```

```
interface HubRowCardProps {
  // LEFT COLUMN
  image: {
    src: string | null;
    alt: string;
    fallbackChar?: string; // e.g. "JD" for avatars
    badge?: string;        // Overlay e.g. "Template"
    icon?: boolean;        // If true, renders standard icon placeholder
  };

  // RIGHT COLUMN - CONTENT
  title: string;
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  };
  description?: string;
  meta?: string[];         // Array of strings, auto-joined by bullets
  
  // RIGHT COLUMN - STATS / CONTEXT
  stats?: React.ReactNode; // Flexible slot for Text or Stats

  // BOTTOM DOCK
  actions?: React.ReactNode; // Slot for Buttons

  // INTERACTION
  href?: string;           // Optional whole-card link
}

```