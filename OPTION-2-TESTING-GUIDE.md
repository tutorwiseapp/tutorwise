# Option 2 Testing Guide - Context-Aware Step1BasicInfo

## Branch Information
**Branch**: `feature/option2-context-aware-step1`
**Commit**: `100a72d`
**GitHub**: https://github.com/tutorwiseapp/tutorwise/pull/new/feature/option2-context-aware-step1

## What is Option 2?

Option 2 makes the `Step1BasicInfo` component directly aware of the `UserProfileContext`, allowing it to reactively populate the tutor name field even if the profile loads after the component initializes.

### Key Differences from Option 1:
| Aspect | Option 1 (Current Production) | Option 2 (Feature Branch) |
|--------|------------------------------|---------------------------|
| **Loading Strategy** | Parent-level guard blocks entire wizard until profile loads | Component-level reactive loading |
| **Context Usage** | Only CreateListingWizard uses context | Step1BasicInfo directly uses context |
| **User Experience** | Shows "Loading your profile..." screen | Renders wizard immediately, shows "Loading profile..." in field |
| **Complexity** | Simpler, fewer moving parts | More complex, reactive useEffect hooks |

## How to Test Locally

### 1. Checkout the Feature Branch
```bash
git checkout feature/option2-context-aware-step1
```

### 2. Start the Development Server
```bash
npm run dev
# Server should start at http://localhost:3000
```

### 3. Test Scenarios

#### Scenario A: Fresh Listing (No Draft)
**Goal**: Verify tutor name populates from profile

1. Login as a tutor
2. Navigate to `/my-listings/create`
3. Click "Let's Get Started" on welcome screen
4. **Expected Result**:
   - Full Name field should show your profile name
   - If profile loads slowly, field briefly shows "Loading profile..." then your name
   - Debug info shows: `isProfileLoading=false | tutorName="Your Name"`

#### Scenario B: With Existing Draft
**Goal**: Verify draft data takes priority over profile

1. Start creating a listing but don't complete it
2. Navigate away (draft auto-saves to localStorage)
3. Return to `/my-listings/create`
4. **Expected Result**:
   - Full Name field shows name from draft (if saved)
   - Title and description fields restore from draft
   - Debug info shows: `formData.tutor_name="Name from Draft"`

#### Scenario C: Slow Network Simulation
**Goal**: Verify loading state works correctly

1. Open Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to `/my-listings/create`
4. **Expected Result**:
   - Field shows "Loading profile..." initially
   - Name appears once profile loads
   - No "Loading..." stuck state

#### Scenario D: Profile Without Name
**Goal**: Verify graceful handling when profile has no name

1. Use a profile that doesn't have `full_name` set
2. Navigate to `/my-listings/create`
3. **Expected Result**:
   - Field shows empty (not "Loading...")
   - Debug info shows: `profile.full_name=undefined | isWaitingForProfile=false`

### 4. Check Browser Console Logs

Watch for these debug messages in the console:
```
[Step1BasicInfo] Syncing tutor name from formData: "John Doe"
[Step1BasicInfo] Initializing tutor name from profile: "John Doe"
[Step1BasicInfo] Profile loaded but no full_name found
```

### 5. Check Debug UI (Development Only)

Look at the bottom of the Full Name field for debug info:
```
Debug: isProfileLoading=false | profile.full_name="John Doe" |
tutorName="John Doe" | isWaitingForProfile=false
```

## What to Look For

### ✅ Success Indicators:
- [ ] Full Name field populates with your name
- [ ] No infinite "Loading..." state
- [ ] Draft data correctly restores on return
- [ ] Console shows appropriate debug messages
- [ ] Field updates smoothly (no flashing/flickering)
- [ ] Can successfully proceed to next step

### ❌ Failure Indicators:
- [ ] Field stuck on "Loading profile..."
- [ ] Console shows infinite loop of messages
- [ ] Name doesn't appear even after profile loads
- [ ] Draft data doesn't restore
- [ ] React errors in console about useEffect dependencies

## Known Improvements Over Option 1

1. **No Full-Page Block**: Wizard renders immediately instead of showing loading screen
2. **Reactive**: Handles profile loading at any time (before or after render)
3. **Priority Logic**: Draft data takes precedence over profile data
4. **Better UX**: Only the specific field shows loading, not entire wizard

## If You Find Issues

### Issue: Infinite Loop
**Symptoms**: Console flooded with messages, browser freezes
**Action**: Note which scenario triggered it, check browser console screenshot

### Issue: Name Doesn't Load
**Symptoms**: Field stays empty or shows "Loading..." forever
**Action**: Check debug info, note profile loading state, screenshot console

### Issue: Draft Doesn't Restore
**Symptoms**: Previous input lost when returning to wizard
**Action**: Check localStorage in DevTools → Application tab → Local Storage

## Comparison Commands

To compare Option 1 (main) vs Option 2 (feature):
```bash
# View Option 1 (current production)
git diff main feature/option2-context-aware-step1 -- apps/web/src/app/components/listings/wizard-steps/Step1BasicInfo.tsx

# Switch between branches
git checkout main                                  # Option 1
git checkout feature/option2-context-aware-step1   # Option 2
```

## Vercel Deployment Issue Note

**Current Status**: Vercel is experiencing deployment failures with error:
> "This deployment encountered an unexpected internal error. We have been notified about the issue. Please try to deploy from a fresh commit."

This is a **Vercel platform issue**, not related to Option 2 code. All deployments (including known-good code) are failing with the same error since ~8 hours ago.

**Testing Approach**: Local testing only until Vercel resolves their platform issue.

## Next Steps After Testing

1. **If Option 2 works perfectly**:
   - Merge feature branch to main when Vercel is back online
   - Update production deployment
   - Close Option 1 implementation

2. **If Option 2 has issues**:
   - Document specific problems found
   - Keep Option 1 as production solution
   - Consider Option 3 (listing templates) for future

3. **If both options work**:
   - User preference: immediate loading (Option 1) vs reactive loading (Option 2)
   - Consider performance impact and user experience

---

**Happy Testing!** 🧪

Report any findings and we can iterate on the implementation.
