# Referrals Performance Tab - Data Quality Requirements

## Overview
This document outlines the data that needs to be tracked to populate all charts in the Referrals Performance tab.

## Required Database Fields

### 1. Attribution Method (`referrals.attribution_method`)
**Purpose**: Track how referrals were attributed to the agent
**Values**:
- `url_parameter` - Referral came via URL parameter (?ref=CODE)
- `cookie` - Referral came via cookie tracking
- `manual_entry` - Manually entered referral code

**Chart**: Attribution Methods (Bar Chart)

**Current Status**: ✓ Already tracked in database schema

---

### 2. Referral Source (`referrals.referral_source`)
**Purpose**: Track which sharing method was used
**Values**:
- `Direct Link` - Default/direct link sharing
- `QR Code` - Shared via QR code
- `Embed Code` - Shared via embedded widget
- `Social Share` - Shared via social media

**Chart**: Referral Sources (Pie Chart)

**Current Status**: ⚠️ Field exists but may not be populated properly
**Action Needed**:
- Update referral link generation to set source parameter
- Track source when QR codes are scanned
- Track source when social share buttons are used

---

### 3. Geographic Data (`referrals.geographic_data`)
**Purpose**: Track where referrals are coming from geographically
**Structure** (JSONB):
```json
{
  "city": "London",
  "region": "Greater London",
  "country": "United Kingdom",
  "ip_address": "xxx.xxx.xxx.xxx" (optional, for privacy)
}
```

**Chart**: Geographic Distribution (Top Cities List)

**Current Status**: ⚠️ Field exists but not populated
**Action Needed**:
- Implement IP geolocation when referrals sign up
- Use service like MaxMind GeoIP or ipapi.co
- Store city, region, country data
- Respect GDPR - consider anonymizing IP addresses

---

### 4. Conversion Tracking (`referrals.status`, `referrals.created_at`)
**Purpose**: Track referral progression over time
**Values**:
- `Referred` - Link clicked, not signed up yet
- `Signed Up` - User signed up but no booking yet
- `Converted` - User made first booking
- `Expired` - Referral link expired

**Chart**: Conversion Trend (Line Chart)

**Current Status**: ✓ Already tracked

---

### 5. Commission Tracking (`referrals.first_commission`)
**Purpose**: Track revenue from referrals
**Structure**: Links to `commissions` table
**Fields**:
- `amount` - Commission amount
- `currency` - Currency code (GBP, USD, etc.)
- `status` - Payment status
- `paid_at` - When commission was paid

**Chart**: Revenue Trends (6-month line chart)

**Current Status**: ✓ Already tracked
**Note**: Only shows data for `Converted` referrals with commission records

---

### 6. Referral Stats RPC (`get_referral_stats`)
**Purpose**: Aggregate KPI metrics
**Returns**:
- `total_clicks` - Total link clicks
- `total_signups` - Total signups
- `total_conversions` - Total conversions
- `total_commission_earned` - Total earnings
- `conversion_rate` - Conversion percentage
- `signup_rate` - Signup percentage

**Display**: KPI Grid (4 cards)

**Current Status**: ✓ Already implemented
**Note**: Returns empty/zero data if agent has no referrals

---

## Implementation Priority

### High Priority (Blocking Charts)
1. **Referral Source Tracking** - Currently showing 100% "Direct Link"
   - Add source parameter to referral links
   - Track QR code scans
   - Track social share clicks

2. **Geographic Data Collection** - Currently empty
   - Implement IP geolocation on signup
   - Store city/region data

### Medium Priority (Nice to Have)
3. **Attribution Method Accuracy** - Currently working but could be improved
   - Ensure all attribution flows are captured
   - Test cookie tracking across sessions
   - Verify manual entry flow

### Low Priority (Already Working)
4. Status tracking - ✓ Working
5. Commission tracking - ✓ Working
6. Stats RPC - ✓ Working

---

## Testing Checklist

### After Implementation
- [ ] Create test referral with QR code → Verify source = "QR Code"
- [ ] Create test referral with social share → Verify source = "Social Share"
- [ ] Create test referral with direct link → Verify source = "Direct Link"
- [ ] Sign up test user → Verify geographic_data is populated with city/region
- [ ] Check Attribution Methods chart → Should show distribution
- [ ] Check Referral Sources chart → Should show distribution (not 100% one source)
- [ ] Check Geographic Distribution → Should show UK cities

---

## Notes

### Privacy Considerations
- IP addresses should be anonymized or not stored (GDPR)
- Geographic data at city level is acceptable
- Users should be informed about tracking in privacy policy

### Performance Considerations
- IP geolocation lookups should be async/background job
- Cache geolocation results to avoid repeated API calls
- Consider rate limits on geolocation services

### Future Enhancements
- Add country-level filtering for international expansion
- Add time-of-day analysis for referral patterns
- Add device type tracking (mobile vs desktop)
- Add referral channel UTM parameter support
