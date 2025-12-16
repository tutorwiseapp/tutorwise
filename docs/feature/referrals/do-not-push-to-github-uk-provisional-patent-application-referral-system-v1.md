# DO-NOT-PUSH-TO-GITHUB-uk-provisional-patent-application-notes

# **UK PROVISIONAL PATENT APPLICATION — FINAL FILING VERSION**

## **Title**

**SYSTEM AND METHOD FOR PERSISTENT MULTI-ROLE REFERRAL ATTRIBUTION IN A DIGITAL SERVICE MARKETPLACE**

* * *

## **Abstract**

A referral attribution system for a multi-role digital service marketplace that enables lifetime linking of referral agents to referred users, independent of device, channel, or signup conditions. The system captures referral metadata from online and offline sources, resolves attribution using hierarchical mechanisms, and permanently binds the resolved referral identifier to a user’s persistent identity profile at account creation. The invention supports both supply-side and demand-side referral agents, cross-role attribution between tutors, clients, and agents, and hybrid offline-online onboarding through encoded links and QR codes. A referral ledger calculates and distributes commissions for future transactions performed by the referred user. The invention provides a unified, role-independent, lifetime referral infrastructure suitable for service marketplaces.

* * *

## **Technical Field**

This invention relates to digital marketplaces, referral tracking systems, and identity attribution mechanisms. In particular, it concerns persistent referral attribution architectures capable of supporting multiple user roles, dual-agent acquisition models, and hybrid offline-online referral capture.

* * *

## **Background of the Invention**

Existing referral systems and affiliate networks generally rely on transient mechanisms such as cookies, link redirects, and device-local identifiers. These mechanisms fail when users change devices, clear browser data, or sign up after a substantial delay. Traditional systems are further limited by single-role attribution models, where referral credit is assigned only in buyer-acquisition or seller-acquisition contexts, but not both simultaneously.

Service marketplaces such as tutoring platforms require robust referral attribution across multiple roles including tutors, clients, and agents, with the ability to compensate referral agents for future transactions. No widely available system provides persistent identity-level referral binding, dual-agent acquisition, cross-role attribution, and hybrid offline-online capture in a unified architecture.

This invention addresses these deficiencies.

* * *

# **Summary of the Invention**

The invention provides a system and method for persistent referral attribution in a multi-role digital service marketplace. A unique referral identifier is generated for each agent. Referral metadata is captured from online and offline interactions through encoded URLs, QR codes, cookies, device fingerprinting, and manual code entry. An attribution resolution module applies a hierarchical evaluation of referral signals. When a new user account is created, the resolved referral identifier is permanently bound to the user’s profile record.

The system supports dual-sided agent acquisition, enabling supply-side agents to refer tutors and demand-side agents to refer clients. Cross-role attribution enables tutors, clients, and agents to refer any other role. A referral ledger calculates commissions for future transactions, including lessons, bookings, or digital product sales. Commissions are automatically distributed according to the ledger.

This architecture provides persistent, role-agnostic, lifetime attribution within a service marketplace.

* * *

# **Detailed Description of the Invention**

## **1\. Referral Identifier Generation**

Upon registration as an agent, the system assigns a unique referral identifier (“RAID”). This identifier is used to generate:

- Referral URLs
- QR codes embedding RAID
- Embedded metadata for third-party placements

These mechanisms enable both online and offline referrals.

* * *

## **2\. Referral Metadata Capture**

A user interacting with an agent’s referral medium triggers one or more of the following storage mechanisms:

1. URL parameter storage
2. First-party cookie storage
3. Device fingerprint hashing
4. Manual code entry during signup

The system captures any available referral metadata and stores it for later resolution.

* * *

## **3\. Attribution Resolution Module**

During signup, the system evaluates referral signals in a defined priority order:

1. URL parameter RAID
2. Cookie RAID
3. Device fingerprint lookup
4. Manual code input

The first non-null value resolves attribution.

* * *

## **4\. Identity-Level Binding (Persistent Attribution)**

When attribution is resolved, the corresponding RAID is permanently stored in the user’s profile record. This value persists for the lifetime of the user account and is not dependent on device, browser, or cookies. This ensures referral attribution continues for all future transactions.

* * *

## **5\. Multi-Role User Architecture**

Users may adopt one or more roles including:

- Tutor (service provider)
- Client (service consumer)
- Agent (referrer)

The system maintains a single profile identity capable of holding multiple roles. Referral attribution applies regardless of the role assumed.

* * *

## **6\. Dual-Agent Acquisition Model**

The system supports two distinct agent categories:

### **6.1 Supply-Side Agents**

Agents who refer tutors to the marketplace. These agents earn commission on lessons or products sold by the referred tutors.

### **6.2 Demand-Side Agents**

Agents who refer clients. These agents earn commission on bookings generated by the referred clients.

Both agent types use the same underlying referral attribution mechanism.

* * *

## **7\. Referral Ledger**

For each transaction involving a tutor or client, the system checks the associated referral agent identifiers stored in their profiles. Commission rules determine whether the supply-side agent, demand-side agent, or both receive commission. The ledger records:

- transaction ID
- agent ID
- commission amount
- timestamp
- payout schedule

The ledger supports lifetime attribution for all future transactions.

* * *

## **8\. Commission Calculation and Distribution**

A commission engine evaluates the ledger and schedules payouts according to marketplace-defined rules. The system may integrate with external payment processors to distribute earnings to agents.

* * *

# **Claims**

## **Independent Claim**

1. **A system for persistent referral attribution in a multi-role digital service marketplace, comprising:**

a) generation of a unique referral identifier for each agent;  
b) capturing referral metadata through encoded links, QR codes, cookies, device fingerprinting, or manual entry;  
c) an attribution resolution module configured to determine a referral agent based on the captured metadata;  
d) a profile-binding module that permanently stores the determined referral identifier within a newly created user’s persistent identity profile;  
e) a multi-role architecture allowing users to act as tutors, clients, agents, or any combination thereof;  
f) a dual-agent acquisition model supporting supply-side agents and demand-side agents; and  
g) a referral ledger configured to calculate and distribute commissions for transactions performed by the referred user.

* * *

## **Dependent Claims**

2. The system of claim 1 wherein the attribution resolution module prioritises referral metadata in the following order: URL parameters, cookies, device fingerprinting, and manual code entry.
3. The system of claim 1 wherein referral attribution persists across device changes, deferred signups, or deletion of local browser data.
4. The system of claim 1 wherein QR codes are used to enable offline referral attribution.
5. The system of claim 1 wherein multiple user roles coexist within a single identity profile and referral attribution applies across roles.
6. The system of claim 1 wherein commission is calculated for indefinitely future transactions associated with the referred user.
7. The system of claim 1 wherein the referral ledger supports payout to supply-side and demand-side agents simultaneously.
8. The system of claim 1 wherein referral metadata is bound to the user’s profile and retains attribution independent of transaction-level identifiers.

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

Diagram illustrating dual-agent acquisition (supply-side and demand-side).

### **Figure 6:**

Role interaction diagram showing cross-role referral attribution between tutors, clients, and agents.

### **Figure 7:**

Referral ledger architecture showing commission calculation and payout.