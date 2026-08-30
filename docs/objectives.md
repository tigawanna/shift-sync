# Objectives

Build checklist for ShiftSync, grouped by **who must be able to accomplish it**.

The take-home brief (evaluation scenarios, weights, ambiguities, deliverables) lives in [requirements.md](./requirements.md). This file is only the role work.

Tick a box when that role can do it in the product. Items marked **needs manager** or **needs admin** are real staff/admin outcomes, but they stay gray until the other role’s work exists — otherwise the feature is a dead end.

**Suggested order:** finish **admin** directories first (people, locations, skills, certifications), then **manager** scheduling (create → assign → publish → constraints), then the remaining **staff** items that depend on a live published week (coverage, live updates, notifications).

---

## Staff

What a staff person must be able to do for themselves.

### Profile and availability

- [x] Sign in as staff and use a staff-only home (calendar)
- [x] Work at one or more locations they are certified for (certs are assigned by admin; staff calendar already respects them)
- [x] Carry skills used for assignment (skills are assigned by admin)
- [x] Set recurring weekly availability
- [x] Set one-off availability exceptions (block hours / mark a day off)
- [ ] State desired hours for the period (needed later for fairness “under/over scheduled”)

### Own schedule

- [x] See assigned shifts only after the location-week is **published**
- [x] See shift times in **that location’s timezone**, not the staff member’s browser timezone
- [x] Treat an overnight shift (e.g. 11pm–3am) as one shift
- [x] See weekly hours on their calendar, with a 35h warning and 40h limit readout
- [ ] See daily-hour warnings (8h warn / 12h hard block) on their own days
- [ ] See a 6th/7th consecutive-day warning on their own week

### Coverage — **needs manager** (approve + edit-cancels-pending)

Swap, drop, and pickup are staff-initiated, but they do not make sense until a manager can approve the final change and until editing a shift cancels a pending request.

- [ ] Request a swap with another qualified staff member
- [ ] Accept or decline an incoming swap
- [ ] Withdraw a pending swap before manager approval
- [ ] Offer a shift as a drop request
- [ ] Pick up an open / dropped shift they are qualified for
- [ ] Stay on the original assignment until the manager approves
- [ ] Be limited to **3** pending swap/drop requests at once
- [ ] Have unclaimed drop requests expire **24 hours** before the shift

### Notifications and live updates — **needs manager** (publish / assign / swap resolution)

- [ ] Get notified when a week is published, a shift is assigned, or a shift changes
- [ ] Get notified at each step of a swap/drop
- [ ] See schedule changes without a full page refresh
- [ ] Open a notification center (read / unread)
- [ ] Choose in-app only vs in-app + email simulation

---

## Manager

What a manager must be able to accomplish for the locations they run. Do this block before the remaining staff coverage items.

### Scope

- [x] Sign in as manager and land on a manager dashboard
- [x] See and manage **only** locations they are assigned to
- [ ] See the team for those locations
- [x] See those locations’ details

### Build and publish a week

- [x] Create a shift: location, date/time, required skill, headcount
- [x] Assign a specific staff member to a shift by hand
- [x] Publish a location-week so staff can see it
- [x] Unpublish before the cutoff (default **48 hours** before the shift; editing a published shift is still open)
- [x] Keep overnight shifts as a single shift
- [x] Show all times in the **location** timezone

### Constraints (block or warn at assign time)

- [x] No double-booking (same person, overlapping times, any location)
- [ ] At least **10 hours** rest between one shift ending and the next starting
- [x] Only assign staff who have the required skill
- [x] Only assign staff certified at that location
- [ ] Only assign inside the staff member’s availability
- [ ] Weekly hours: warn at 35+, treat 40+ as over the weekly limit
- [ ] Daily hours: warn over 8h, hard-block over 12h
- [ ] Warn on the **6th** consecutive day in a week
- [ ] Require a documented override for the **7th** consecutive day
- [ ] When a rule fails, explain **which rule** and **why**
- [ ] Suggest qualified alternatives when assignment fails

### Coverage approvals — pair with staff swap/drop

- [ ] Approve or reject a swap/drop; original assignment stays until this happens
- [ ] Auto-cancel a pending swap if that shift is edited, and notify the parties

### Overtime and fairness

- [ ] See projected overtime cost for the week
- [ ] See which assignments are pushing someone into overtime
- [ ] See what-if hours **before** confirming an assignment
- [ ] Hours-distribution report for a selected period
- [ ] Tag Friday/Saturday evening shifts as premium
- [ ] See a fairness score for premium-shift distribution
- [ ] See who is under/over their stated desired hours

### Live ops, comms, audit

- [ ] Immediate conflict if two managers assign the same person at the same time
- [ ] “On duty now” for their locations (live)
- [ ] Notifications: pending swap/drop, overtime warnings, staff availability changes
- [ ] Notification center + in-app / email-simulation preference
- [ ] View the change history of any shift

---

## Admin

What corporate admin must be able to accomplish across **all** locations.

### Directory and org

- [x] Sign in as admin and use an admin home
- [x] List and search staff
- [x] List managers
- [x] List other admins
- [x] List locations (name, timezone, address)
- [x] Create / edit locations
- [x] Assign managers to locations (scope that managers later honor)
- [x] Assign staff skills
- [x] Certify staff at one or more locations
- [x] Decide what happens to history when a staff member is de-certified (document the choice in [requirements.md](./requirements.md) ambiguities)

### Oversight

- [ ] See every location’s schedule (admin schedules page is still a stub)
- [ ] See who is working where this week (the “no central view” pain)
- [ ] See the same overtime and fairness reports as managers, but for any location
- [ ] See “on duty now” for every location (live)

### Audit and comms

- [ ] Every schedule change logged: who, when, before, after
- [ ] Export audit logs for a date range and location
- [ ] Same notification center / preference model as other roles, scoped to org-wide events
