# Remaining objectives — iteration plan

Work the leftover [objectives.md](./objectives.md) boxes in small commits. Tick a step here when that commit lands. Do not pile two steps into one commit.

**Decisions to write into [requirements.md](./requirements.md) as they land:** desired hours vs availability; post-approval swap edit; overtime rate; premium definition; live-update mechanism.

---

## 1. Desired hours — done

Staff state a weekly hour target for each Monday–Sunday week. Availability stays “when I can work”; desired hours stay “how much I want.” Fairness later compares scheduled hours in that week to this number.

- Schema + server read/write
- Staff calendar: set/see desired hours per week
- Tick: *State desired hours for the period*

## 2. Coverage data model — done

Swap, drop, and pickup as persisted requests. Original assignment does not move until a manager approves. Max **3** pending swap/drop per staff. Unclaimed drops expire **24 hours** before the shift starts. Editing a shift cancels pending requests on it.

- Tables + status machine + expiry helper
- Shared server rules (qualify, pending cap, expire)

## 3. Staff coverage UI — done

Staff can request a swap, accept/decline, withdraw, drop a shift, and pick up an open drop they qualify for.

- Tick all Staff → Coverage boxes except those that need manager approve (those tick in step 4)

## 4. Manager coverage approvals — done

Manager inbox: approve or reject. Approve is the only write that moves the assignment. Shift edit/delete cancels pending requests.

- Tick Staff “stay on original until approve”
- Tick Manager coverage approvals

## 5. Overtime, what-if, fairness — done

Projected OT cost for a location-week. Highlight assignments that push someone over 40h. What-if hours on the assign sheet. Hours-distribution report. Fri/Sat evening = premium. Fairness score on premium counts. Under/over vs desired hours.

- Tick Manager → Overtime and fairness

## 6. Admin oversight + on duty — done

Admin schedules page: every location week + who is working where. Same OT/fairness reports, any location. “On duty now” (refetch) for managers (their locations) and admin (all).

- Tick Admin → Oversight
- Tick Manager “on duty now”

## 7. Audit trail — done

Log schedule writes (who, when, before, after). Manager can open history on a shift. Admin can export by date range + location.

- Tick Manager “view change history”
- Tick Admin audit boxes

## 8. Notifications, live refresh, concurrent assign

In-app notification center (read/unread). Preference: in-app only vs in-app + email simulation (toast/log). Events: publish, assign, shift change, swap/drop steps, pending for managers, OT warnings, availability changes. Poll/invalidate so staff see schedule changes without a full reload. Assign re-checks constraints in the write so two managers cannot land the same person in an overlap.

- Tick remaining Staff / Manager / Admin notification boxes
- Tick Manager concurrent-assign conflict
