# DO-NOT-PUSH-TO-GITHUB-uk-provisional-patent-application-notes

# **UK PROVISIONAL PATENT APPLICATION — VERSION 2.0**

**Version**: 2.0
**Date**: 2025-12-16
**Status**: Final Filing Version (Amended)

---

## **CHANGE LOG (v1.0 → v2.0)**

**Major Changes:**
- Removed device fingerprinting (Sections 2, 3, Dependent Claim 2) - GDPR compliance
- Added Section 7: Commission Delegation Mechanism (NEW - core novelty)
- Added Dependent Claim 9: Commission delegation
- Changed terminology: "RAID" → "referral code" throughout
- Updated Independent Claim 1(g): Added delegation mechanism
- Updated claim language: "distributes" → "schedules" payouts
- Updated Abstract: Added delegation mechanism

**Minor Changes:**
- Clarified supply-side implementation status in claim 1(f)
- Updated title to include "Conditional Commission Delegation"

---

* * *

## **Title**

**SYSTEM AND METHOD FOR PERSISTENT MULTI-ROLE REFERRAL ATTRIBUTION WITH CONDITIONAL COMMISSION DELEGATION IN A DIGITAL SERVICE MARKETPLACE**

* * *

## **Abstract**

A referral attribution system for a multi-role digital service marketplace that enables lifetime linking of referral agents to referred users, independent of device, channel, or signup conditions. The system captures referral metadata from online and offline sources, resolves attribution using hierarchical mechanisms, and permanently binds the resolved referral identifier to a user's persistent identity profile at account creation.

A novel conditional commission delegation mechanism allows service providers to delegate commission payments to partner profiles for transactions where the service provider is the direct referrer, while preserving original agent attribution when third parties bring clients. This enables offline partnership models without violating lifetime attribution rights.

The invention supports supply-side referral agents (with architecture supporting future demand-side extension), cross-role attribution between tutors, clients, and agents, and hybrid offline-online onboarding through encoded links and QR codes. A referral ledger calculates and schedules commission payouts for future transactions performed by the referred user. The invention provides a unified, role-independent, lifetime referral infrastructure suitable for service marketplaces.

* * *

## **Technical Field**

This invention relates to digital marketplaces, referral tracking systems, identity attribution mechanisms, and commission delegation architectures. In particular, it concerns persistent referral attribution architectures capable of supporting multiple user roles, dual-agent acquisition models, hybrid offline-online referral capture, and conditional commission routing for partnership programs.

* * *

## **Background of the Invention**

Existing referral systems and affiliate networks generally rely on transient mechanisms such as cookies, link redirects, and device-local identifiers. These mechanisms fail when users change devices, clear browser data, or sign up after a substantial delay. Traditional systems are further limited by single-role attribution models, where referral credit is assigned only in buyer-acquisition or seller-acquisition contexts, but not both simultaneously.

Service marketplaces such as tutoring platforms require robust referral attribution across multiple roles including tutors, clients, and agents, with the ability to compensate referral agents for future transactions. Existing systems also lack mechanisms to enable offline partnership programs while preserving the attribution rights of agents who originally referred the service provider.

No widely available system provides persistent identity-level referral binding, dual-agent acquisition, cross-role attribution, hybrid offline-online capture, and conditional commission delegation in a unified architecture.

This invention addresses these deficiencies.

* * *

# **Summary of the Invention**

The invention provides a system and method for persistent referral attribution in a multi-role digital service marketplace. A unique referral identifier (referral code) is generated for each agent. Referral metadata is captured from online and offline interactions through encoded URLs, QR codes, cookies, and manual code entry. An attribution resolution module applies a hierarchical evaluation of referral signals. When a new user account is created, the resolved referral identifier is permanently bound to the user's profile record.

A novel conditional commission delegation mechanism allows service providers to configure a delegation target profile for specific listings. When a transaction occurs, the system evaluates whether the service provider was the direct referrer. If true, commission is routed to the configured delegation target. If a third-party agent brought the client, commission is routed to the original referring agent, preserving their lifetime attribution rights.

The system supports dual-sided agent acquisition, enabling supply-side agents to refer tutors (with architecture supporting future demand-side agent monetization for client referrals). Cross-role attribution enables tutors, clients, and agents to refer any other role. A referral ledger calculates commissions for future transactions, including lessons, bookings, or digital product sales. Commissions are scheduled for payout according to the ledger.

This architecture provides persistent, role-agnostic, lifetime attribution with flexible commission routing for partnership programs within a service marketplace.

* * *

# **Detailed Description of the Invention**

## **1. Referral Identifier Generation**

Upon registration as an agent, the system assigns a unique referral identifier (referral code). This identifier is used to generate:

- Referral URLs
- QR codes embedding the referral code
- Shareable links for third-party placements

These mechanisms enable both online and offline referrals.

* * *

## **2. Referral Metadata Capture**

A user interacting with an agent's referral medium triggers one or more of the following storage mechanisms:

1. URL parameter storage
2. First-party cookie storage
3. Manual code entry during signup

The system captures any available referral metadata and stores it for later resolution.

* * *

## **3. Attribution Resolution Module**

During signup, the system evaluates referral signals in a defined priority order:

1. URL parameter referral code
2. Cookie referral code
3. Manual code input

The first non-null value resolves attribution.

* * *

## **4. Identity-Level Binding (Persistent Attribution)**

When attribution is resolved, the corresponding referral code is permanently stored in the user's profile record. This value persists for the lifetime of the user account and is not dependent on device, browser, or cookies. This ensures referral attribution continues for all future transactions.

* * *

## **5. Multi-Role User Architecture**

Users may adopt one or more roles including:

- Tutor (service provider)
- Client (service consumer)
- Agent (referrer)

The system maintains a single profile identity capable of holding multiple roles. Referral attribution applies regardless of the role assumed.

* * *

## **6. Dual-Agent Acquisition Model**

The system supports two distinct agent categories:

### **6.1 Supply-Side Agents**

Agents who refer tutors to the marketplace. These agents earn commission on lessons or products sold by the referred tutors.

### **6.2 Demand-Side Agents**

The system architecture supports agents who refer clients, though this is not currently monetized. The referral tracking mechanism works identically for clients, enabling future demand-side agent monetization.

Both agent types use the same underlying referral attribution mechanism.

* * *

## **7. Commission Delegation Mechanism**

### **7.1 Overview**

The commission delegation mechanism enables service providers to configure a delegation target profile for specific listings. When a transaction occurs, the system conditionally routes commission based on who brought the client:

- If the service provider was the direct referrer → pay the delegated partner
- If a third-party agent brought the client → pay the original agent

This preserves lifetime attribution rights while enabling offline partnership models.

### **7.2 Technical Implementation**

Service providers configure delegation at the listing level. The system stores a delegation target identifier for each listing. At transaction time, the system evaluates:

```
FUNCTION determine_commission_recipient(transaction):
  listing = lookup_listing(transaction.listing_id)
  service_provider = lookup_profile(listing.service_provider_id)
  client = lookup_profile(transaction.client_profile_id)

  IF listing.delegation_target_id IS NULL:
    RETURN service_provider.referred_by_agent_id

  IF client.referred_by_agent_id == service_provider.id:
    RETURN listing.delegation_target_id
  ELSE:
    RETURN service_provider.referred_by_agent_id

END FUNCTION
```

### **7.3 Use Cases**

**Use Case 1 - Coffee Shop Partnership:** Service provider partners with physical location. When customers scan QR code at coffee shop and book service, coffee shop earns commission (delegation applies).

**Use Case 2 - Third-Party Agent Protection:** When a different agent brings the client, original referring agent receives commission (delegation ignored), protecting lifetime attribution rights.

**Use Case 3 - Organic Discovery:** When client finds service provider through search engines or direct traffic, original referring agent receives commission (no delegation configured).

### **7.4 Fraud Prevention**

The system prevents commission theft by cryptographically verifying attribution provenance. Client referral attribution is immutably stamped at signup and cannot be retroactively changed.

* * *

## **8. Commission Calculation and Distribution**

### **8.1 Commission Engine**

A commission engine evaluates the ledger and schedules payouts according to marketplace-defined rules. The system may integrate with external payment processors to distribute earnings to agents.

### **8.2 Delegation Integration**

The commission delegation mechanism (Section 7) determines the commission recipient at transaction time. The system creates commission records for the appropriate profile based on the delegation evaluation.

* * *

## **9. Referral Ledger**

For each transaction involving a tutor or client, the system checks the associated referral agent identifiers stored in their profiles. Commission rules determine whether the supply-side agent, demand-side agent, delegated partner, or combinations thereof receive commission. The ledger records:

- transaction ID
- agent ID
- commission amount
- timestamp
- payout schedule

The ledger supports lifetime attribution for all future transactions.

* * *

# **Claims**

## **Independent Claim**

1. **A system for persistent referral attribution in a multi-role digital service marketplace, comprising:**

a) generation of a unique referral identifier for each agent;
b) capturing referral metadata through encoded links, QR codes, cookies, or manual entry;
c) an attribution resolution module configured to determine a referral agent based on the captured metadata;
d) a profile-binding module that permanently stores the determined referral identifier within a newly created user's persistent identity profile;
e) a multi-role architecture allowing users to act as tutors, clients, agents, or any combination thereof;
f) a dual-agent acquisition model supporting supply-side agents who refer service providers, with architecture supporting future demand-side agent monetization for client referrals;
g) a conditional commission delegation mechanism enabling service providers to configure per-listing delegation targets, wherein commission is routed to the delegation target when the service provider is the direct referrer, and routed to the service provider's original referring agent when a third party brings the client; and
h) a referral ledger configured to calculate and schedule commission payouts for transactions performed by the referred user.

* * *

## **Dependent Claims**

2. The system of claim 1 wherein the attribution resolution module prioritises referral metadata in the following order: URL parameters, cookies, and manual code entry.

3. The system of claim 1 wherein referral attribution persists across device changes, deferred signups, or deletion of local browser data.

4. The system of claim 1 wherein QR codes are used to enable offline referral attribution.

5. The system of claim 1 wherein multiple user roles coexist within a single identity profile and referral attribution applies across roles.

6. The system of claim 1 wherein commission is calculated for indefinitely future transactions associated with the referred user.

7. The system of claim 1 wherein the referral ledger supports payout to supply-side agents, with architecture supporting future demand-side agent payouts.

8. The system of claim 1 wherein referral metadata is bound to the user's profile and retains attribution independent of transaction-level identifiers.

9. **The system of claim 1 wherein the conditional commission delegation mechanism:**

a) allows service providers to configure a delegation target identifier for individual listings;
b) evaluates at transaction time whether the client's referral attribution matches the service provider's identifier;
c) routes commission to the delegation target when the service provider is the direct referrer; and
d) routes commission to the service provider's original referring agent when the client was referred by a third party, thereby preserving lifetime attribution rights while enabling partnership programs.

* * *

# **Figure Descriptions**

### **Figure 1:**

Block diagram illustrating referral identifier generation for agents.

### **Figure 2:**

Sequence diagram showing offline QR interaction, deferred signup, and attribution resolution.

### **Figure 3:**

Flow diagram depicting the hierarchical attribution resolution algorithm.

### **Figure 4:**

Diagram showing persistent binding of referral metadata to the identity profile.

### **Figure 5:**

Diagram illustrating dual-agent acquisition (supply-side and demand-side architecture).

### **Figure 6:**

Role interaction diagram showing cross-role referral attribution between tutors, clients, and agents.

### **Figure 7:**

Referral ledger architecture showing commission calculation and payout.

### **Figure 8:**

Flow diagram for conditional commission delegation decision tree (Dependent Claim 9).

---

**END OF PATENT APPLICATION VERSION 2.0**
