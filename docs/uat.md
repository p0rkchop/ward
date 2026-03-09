---
layout: default
title: User Acceptance Testing
nav_order: 10
---

# User Acceptance Testing (UAT)

This document contains the UAT checklists for Ward. Each section is organized by role and can be completed independently unless noted otherwise.

---

## UAT Overview

| Item | Detail |
|:-----|:-------|
| **Environment** | Production — [career-ward.app](https://career-ward.app) |
| **Testers** | 2–3 people, each assigned one role |
| **Admin testing** | Developer only (admin credentials are not shared) |
| **Devices** | Desktop browser + mobile device |
| **Pass criteria** | All critical-path items pass. Minor/cosmetic issues are documented but do not block acceptance. |
| **Bug tracking** | [GitHub Issues](https://github.com/p0rkchop/ward/issues) with the `uat` label |
| **Out of scope** | Danger Zone data reset, accessibility audit, performance/load testing, cron job testing |

---

## How to Use This Document

1. **Find your assigned section(s)** — Admin (Section B), Professional (Section C), or Client (Section D)
2. **Complete all shared sections** — Sections A, E, G, H, and I apply to everyone
3. **Check each box** as you complete a test. Mark items that fail with ❌ and file a GitHub Issue
4. **For cross-role tests (Section F)** — coordinate with other testers so actions happen in the right order

### Filing a Bug

When something fails, create a [GitHub Issue](https://github.com/p0rkchop/ward/issues/new) with:

- **Title**: Brief description (e.g., "Client: Cancel button missing on mobile")
- **Label**: `uat`
- **Body**:
  - **Role**: Admin / Professional / Client
  - **Device**: Desktop or Mobile + browser name
  - **Steps to reproduce**: What you did
  - **Expected**: What should have happened
  - **Actual**: What happened instead
  - **Screenshot**: Attach if possible

---

## Pre-UAT Checklist (Developer Only)

Complete these before inviting testers:

- [ ] **Health check** — Visit `career-ward.app/api/health` and confirm `{"status":"healthy"}`
- [ ] **Verify existing data** — Log in as Admin, confirm events, resources, and users exist
- [ ] **Test email infrastructure** — Admin Settings → Email Test Panel → Send test email → Confirm delivery
- [ ] **Create GitHub label** — Add a `uat` label to the repository for issue tracking
- [ ] **Tester accounts** — Each tester logs in with their real phone number and completes setup:
  - Professional tester: enters the event's professional password during setup
  - Client tester: leaves the role password blank
- [ ] **Confirm tester emails** — Each tester has an email address on their profile (needed for email verification tests)
- [ ] **Share this document** — Send testers the link to this page and their assigned role section

---

## Section A: Authentication & Onboarding

**Assigned to:** All testers

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| A1 | **Login page loads** | Go to `career-ward.app`. You should be redirected to the login page. | Login page displays with phone number field and branding image (if configured) |
| A2 | **Enter phone number** | Type your real phone number and submit. | "Verification code sent" message appears. You receive an SMS within 30 seconds. |
| A3 | **Enter verification code** | Enter the 6-digit code from your SMS. | You are logged in and redirected to your role's dashboard (or setup page if first login). |
| A4 | **Invalid phone number** | Try submitting a phone number with fewer than 10 digits. | Error message appears. No SMS is sent. |
| A5 | **Wrong verification code** | Enter an incorrect 6-digit code. | Error message appears. You can try again. |
| A6 | **Expired code** | Wait 5+ minutes after receiving a code, then enter it. | Error message indicating the code is invalid or expired. |
| A7 | **Profile setup (first login only)** | On the setup page, enter your name and email. Enter the appropriate role password (or leave blank for Client). | Role is assigned correctly. You are redirected to the correct dashboard after a brief confirmation. |
| A8 | **Duplicate email** | During setup, enter an email that another tester is already using. | Error message: "This email is already in use." |
| A9 | **Sign out** | Click the sign-out button on your profile page. | You are redirected to the login page. Navigating to a protected page redirects back to login. |
| A10 | **Sign back in** | Log in again with your phone number. | You go directly to your dashboard (setup is skipped since it's already complete). |

---

## Section B: Admin Role

**Assigned to:** Developer only

### Dashboard

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B1 | **Dashboard loads** | Navigate to the Admin dashboard. | Dashboard displays with stat cards: Total Users, Active Resources, Analytics, Upcoming Bookings. |
| B2 | **Stats accuracy** | Compare dashboard numbers to the actual data in Users, Resources, and Events pages. | Numbers match. |
| B3 | **Stat card navigation** | Click each stat card. | Each card navigates to the correct detail page. |

### User Management

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B4 | **View users** | Go to the Users page. | Table shows all users with Name, Phone, Email, Role, and dates. Counts by role are displayed. |
| B5 | **Sort users** | Click column headers (Name, Role, Created At). | Table re-sorts by that column. |
| B6 | **Filter by role** | Use the role filter to show only Professionals. | Only Professional users are displayed. |
| B7 | **Change user role** | Change a test user's role (e.g., Client → Professional). | Role updates. User receives a "Role Changed" email. |
| B8 | **Revert role** | Change the same user's role back. | Role reverts. Another email is sent. |

### Resource Management

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B9 | **View resources** | Go to the Resources page. | Table shows all resources with Name, Description, Location, Quantity, Professionals per Unit, Active status. |
| B10 | **Create resource** | Click Create, fill in Name, Quantity (2), Professionals per Unit (1). Save. | Resource appears in the table. |
| B11 | **Edit resource** | Edit the resource you just created. Change the location. Save. | Changes are reflected in the table. |
| B12 | **Toggle active** | Set a resource to inactive. | Resource shows as inactive. It should not appear when assigning resources to events. |
| B13 | **Delete resource** | Delete the test resource you created. | Resource is removed from the table. |

### Event Management

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B14 | **View events** | Go to the Events page. | All events are listed with Name, Date Range, Timezone, Professional count, Active status. |
| B15 | **Create event** | Create a new event with a 3-day date range, default times 9 AM–5 PM, and a professional password. | Event appears in the list. Event days are auto-generated for each date in the range. |
| B16 | **Edit event** | Change the event name and extend the date range by 1 day. | Name updates. A new event day is created for the added date. |
| B17 | **Shrink date range** | Remove a day from the end of the event's date range. | The removed event day is deleted. Any shifts/bookings on that day are cancelled. |
| B18 | **Toggle event active** | Set an event to inactive. | Event shows as inactive. |
| B19 | **Delete event** | Delete the test event you created. | Event is removed from the list. |

### Event Days & Blackouts

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B20 | **View event days** | Open an existing event's detail view. | All event days are listed with Date, Start Time, End Time, Active status. |
| B21 | **Edit event day times** | Change one event day's start time to 10:00 AM. | Time updates. Shifts outside the new window should not be bookable. |
| B22 | **Create blackout** | Add a blackout (e.g., 12:00 PM–1:00 PM, description "Lunch"). | Blackout appears on the event day. Those times are blocked from shifts/bookings. |
| B23 | **Delete blackout** | Remove the blackout you just created. | Blackout is removed. The time window is available again. |

### Event Resources

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B24 | **Assign resource** | Assign an active resource to an event. | Resource appears in the event's assigned resources list. |
| B25 | **Unassign resource** | Remove the resource from the event. | Resource is removed from the list. Any shifts on that resource for this event are cancelled. |

### Event Agenda & Bookings

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B26 | **Agenda view** | Open an event's agenda view. | Calendar/timeline view shows shifts, bookings, and blackouts for the event's date range. |
| B27 | **View event bookings** | Open an event's bookings view. | Table shows all bookings with Client Name, Date/Time, Professional, Resource, Status. |
| B28 | **Reassign booking** | Reassign a booking to a different shift/timeslot. | Booking updates. Client receives a "Booking Reassigned" email with old and new details. Professional(s) are notified. |
| B29 | **Cancel booking (admin)** | Cancel a booking from the admin bookings view. | Booking is cancelled. Client receives an "Admin Cancellation" email. Professional receives a cancellation notification. |

### Branding & Settings

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B30 | **Upload branding image** | Go to Admin Settings → Branding. Upload an image. | Image preview appears. The login page shows the new branding image. |
| B31 | **Remove branding image** | Remove the branding image. | Image is cleared. Login page no longer shows a custom image. |
| B32 | **Change site name** | Go to General Settings. Change the site name. | Nav headers across all roles update to show the new name. |
| B33 | **Change timeslot duration** | Change the timeslot duration (e.g., 30 min → 45 min). | Client booking page shows timeslots in the new duration. **Change back when done.** |
| B34 | **Email test panel** | Enter your email address in the test panel and click Send. | You receive a test email within 1 minute. Success message is displayed. |

### Analytics

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| B35 | **Analytics page loads** | Go to the Analytics page. | Key metrics display: User Growth, Booking Rate, Utilization %, Active Resources. Role distribution and booking status breakdown are shown. |
| B36 | **Analytics accuracy** | Spot-check 2–3 numbers against what you see on the Users and Events pages. | Numbers are consistent. |

---

## Section C: Professional Role

**Assigned to:** Professional tester

### Dashboard

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| C1 | **Dashboard loads** | Log in and go to your dashboard. | Greeting with your name. Stat cards show: Available Slots, Today's Bookings, Tomorrow's Bookings, Today's Shifts. |
| C2 | **Stat card navigation** | Click each stat card. | Each navigates to the correct page (Shifts, Bookings). |

### Shifts

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| C3 | **View shifts page** | Go to My Shifts. | Page shows upcoming shifts (if any) and a "Create New Shift" button. |
| C4 | **Create shift** | Click Create New Shift. Select your event, a resource, a future date, and set a time range (e.g., 9:00 AM–12:00 PM). Submit. | Shift is created and appears in the upcoming shifts list. |
| C5 | **Validation — missing fields** | Try to create a shift without selecting a resource or date. | Form shows validation errors. Shift is not created. |
| C6 | **Validation — past date** | Try to create a shift for a date in the past. | Error message. Shift is not created. |
| C7 | **Validation — outside event hours** | Try to create a shift with times outside the event day's hours. | Error message. Shift is not created. |
| C8 | **Validation — overlapping shift** | Try to create a shift that overlaps with one you already have. | Error message about overlap. Shift is not created. |
| C9 | **View shift details** | Look at a shift in the upcoming list. | Shows date, time range, resource name, location, and status. |
| C10 | **Cancel shift (no bookings)** | Cancel a shift that has no client bookings on it. | Shift is removed from the upcoming list. |
| C11 | **Cancel shift (with bookings)** | Try to cancel a shift that has client bookings. | Error message: cannot cancel a shift with active bookings. Shift remains. |

### Calendar

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| C12 | **Calendar view** | Go to the Calendar page. | Weekly calendar grid displays your shifts and bookings. |
| C13 | **Navigate weeks** | Use Previous/Next buttons to move between weeks. | Calendar updates to show the correct week. |
| C14 | **Today button** | Click "Today" to jump back to the current week. | Calendar returns to the current week. |

### Bookings

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| C15 | **View bookings page** | Go to My Bookings. | Page shows upcoming and past bookings (if any). |
| C16 | **Booking appears after client books** | After a Client tester books an appointment on your shift (see Section F), refresh this page. | The new booking appears with the client's name, date/time, and resource. |
| C17 | **Booking notification email** | Check your email after a client books on your shift. | You receive a "New Booking" email with appointment details. |

---

## Section D: Client Role

**Assigned to:** Client tester

### Dashboard

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| D1 | **Dashboard loads** | Log in and go to your dashboard. | Greeting with your name. Stat cards for Today's, Tomorrow's, Upcoming, and This Week's appointments. |
| D2 | **Empty state** | If you have no appointments, confirm the dashboard shows a helpful message. | "No appointments" message displayed with a link to book. |

### Book Appointment

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| D3 | **Booking page loads** | Go to Book Appointment. | Page shows available timeslots grouped by date. A "How it works" panel explains the 3-step process. |
| D4 | **Browse available slots** | Scroll through dates and timeslots. | Slots are displayed with times (formatted per your settings) and availability indicators. |
| D5 | **Select and book** | Click an available timeslot, then click "Book Appointment." | Confirmation message appears. The appointment shows up on your dashboard and appointments page. |
| D6 | **Confirmation email** | Check your email after booking. | You receive a "Booking Confirmed" email with date, time, professional name, resource, and location. |
| D7 | **No available slots** | Browse a date that has no professional shifts. | Message indicates no available slots. The book button is disabled or hidden. |
| D8 | **Book a second appointment** | Book another appointment on a different timeslot. | Second booking succeeds and both appear in your appointments list. |

### Manage Appointments

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| D9 | **View appointments** | Go to My Appointments. | Upcoming appointments displayed with Date, Time, Professional, Resource, Location, Status, and Cancel button. |
| D10 | **Cancel appointment** | Cancel one of your appointments. Confirm the prompt. | Appointment status changes to cancelled. It moves to past/cancelled section. |
| D11 | **Cancellation email** | Check your email after cancelling. | You receive a "Booking Cancelled" email. |
| D12 | **Professional notified** | Ask the Professional tester to check their email. | They receive a notification that your booking was cancelled. |
| D13 | **Past appointments** | If you have past appointments, expand the Past section. | Past bookings are listed (read-only, no cancel button). |

---

## Section E: User Settings

**Assigned to:** All testers

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| E1 | **Settings page loads** | Go to Settings (gear icon or menu). | Page shows your name, role, phone (read-only) and editable preferences. |
| E2 | **Change theme — Dark** | Set theme to Dark. | Page immediately switches to dark mode. Setting persists after refresh. |
| E3 | **Change theme — Light** | Set theme to Light. | Page switches to light mode. |
| E4 | **Change theme — System** | Set theme to System. | Page follows your device's system preference. |
| E5 | **Change time format** | Switch between 12h and 24h. | All times across the app update (e.g., "2:00 PM" ↔ "14:00"). |
| E6 | **Change date format** | Switch between MM/DD/YYYY, DD/MM/YYYY, and YYYY-MM-DD. | All dates across the app update to the selected format. |
| E7 | **Change timezone** | Select a different timezone (e.g., switch from Central to Eastern). | Times displayed across the app shift by the correct offset. |
| E8 | **Settings persist** | Change a setting, sign out, sign back in, and go to Settings. | Your previous choices are still selected. |

---

## Section F: Cross-Role Scenarios

**Assigned to:** All testers (coordinated)

These tests require actions from multiple roles in sequence. Coordinate with your fellow testers.

| # | Test | Steps | Expected Result |
|:--|:-----|:------|:----------------|
| F1 | **Full booking lifecycle** | 1. **Professional**: Create a shift on a future date. 2. **Client**: Go to Book Appointment, find the new slot, and book it. 3. **Professional**: Check My Bookings — the new booking appears. | Booking is visible to both Client and Professional. Both receive confirmation emails. |
| F2 | **Admin reassigns booking** | 1. **Admin**: Go to Event Bookings, find the booking from F1, and reassign it to a different timeslot. | Client receives "Booking Reassigned" email with old and new details. Professional(s) receive notifications. Booking details update for Client. |
| F3 | **Admin cancels booking** | 1. **Client**: Book a new appointment. 2. **Admin**: Cancel that booking from Event Bookings. | Client receives "Admin Cancellation" email. Professional receives cancellation notification. Booking disappears from Client's upcoming list. |
| F4 | **Role change notification** | 1. **Admin**: Change a test user's role (e.g., Client → Professional). 2. **User**: Check email. 3. **User**: Log out and back in. | User receives "Role Changed" email. After re-login, they are redirected to the new role's dashboard. Access to the old role's pages is blocked. |
| F5 | **Revert role change** | 1. **Admin**: Change the user's role back to the original. | User receives another email. After re-login, they return to their original dashboard. |

---

## Section G: Mobile Testing

**Assigned to:** All testers (on a phone or tablet)

Repeat your role's critical path on a mobile device. Focus on usability, not re-testing every feature.

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| G1 | **Login on mobile** | Open `career-ward.app` on your phone's browser. Log in. | Login page renders correctly. Phone keyboard appears for the number input. SMS code entry works. |
| G2 | **Dashboard on mobile** | View your role's dashboard. | Stat cards stack vertically. All content is readable without horizontal scrolling. |
| G3 | **Navigation menu** | Open the navigation menu (hamburger/menu icon). | Menu opens and all links are tappable. You can navigate to all pages for your role. |
| G4 | **Forms on mobile** | Complete a key action for your role: Professional → create a shift, Client → book an appointment, Admin → create a resource. | Form fields are usable. Dropdowns, date pickers, and buttons work on touch. No fields are cut off. |
| G5 | **Tables on mobile** | View a page with a table (shifts, bookings, appointments, users). | Table is scrollable horizontally or adapts to the screen width. Data is readable. |
| G6 | **Settings on mobile** | Go to Settings and change a preference. | Dropdowns and toggles work on touch. Changes save correctly. |

---

## Section H: Email Verification Matrix

**Assigned to:** All testers — check your inbox for each email type you should have received during testing.

| # | Email Type | Trigger | Recipient | Verified? |
|:--|:-----------|:--------|:----------|:----------|
| H1 | **Welcome** | Completing profile setup (Section A) | New user | ☐ |
| H2 | **Booking Confirmation** | Client books appointment (D5, F1) | Client | ☐ |
| H3 | **New Booking (Professional)** | Client books on your shift (F1) | Professional | ☐ |
| H4 | **Booking Cancelled (Client)** | Client cancels appointment (D10) | Client | ☐ |
| H5 | **Booking Cancelled (Professional)** | A booking on your shift is cancelled (D10, F3) | Professional | ☐ |
| H6 | **Admin Cancellation** | Admin cancels a booking (F3) | Client | ☐ |
| H7 | **Booking Reassigned** | Admin reassigns a booking (F2) | Client | ☐ |
| H8 | **Role Changed** | Admin changes user role (F4) | Affected user | ☐ |
| H9 | **Test Email** | Admin sends test email (B34) | Admin | ☐ |

**Note:** Account Deletion email is skipped — it requires deleting a user on production.

For each email, verify:
- [ ] Email was received (check spam/junk folder if not in inbox)
- [ ] Subject line is clear and relevant
- [ ] Body contains correct details (names, dates, times, locations)
- [ ] Sender shows as `noreply@career-ward.app`

---

## Section I: Edge Cases & Error Handling

**Assigned to:** All testers (pick the ones relevant to your role)

| # | Test | Instructions | Expected Result |
|:--|:-----|:-------------|:----------------|
| I1 | **Unauthorized URL access** | While logged in as your role, type a URL for a different role's page (e.g., Client types `career-ward.app/admin/dashboard`). | You are redirected to an "Unauthorized" page. You cannot see the other role's data. |
| I2 | **Direct URL while logged out** | Sign out. Type `career-ward.app/client/dashboard` directly. | You are redirected to the login page. |
| I3 | **Profile page** | Go to your Profile page. | Your name, phone, role (with colored badge), and user ID are displayed correctly. |
| I4 | **Legal pages accessible** | Visit `/privacy`, `/terms`, and `/communications` while logged out. | All three pages load without requiring login. |
| I5 | **Health check** | Visit `career-ward.app/api/health`. | JSON response with `{"status":"healthy"}` and database connected. |
| I6 | **Root URL redirect** | Visit `career-ward.app/` while logged in. | You are redirected to your role's dashboard (not a 404 or blank page). |
| I7 | **Browser back button** | After navigating through several pages, use the browser's back button. | App navigates correctly without errors or blank pages. |

---

## UAT Sign-Off

Once all sections are complete, review the results:

### Acceptance Criteria

- **All critical-path items pass** — Sections A, B, C, D core items (login, CRUD, booking lifecycle)
- **Cross-role scenarios work** — Section F confirms end-to-end workflows
- **Emails are delivered** — Section H confirms all notification types
- **Mobile is usable** — Section G confirms no major layout/usability issues
- **No blocking bugs remain** — All `uat`-labeled GitHub Issues marked Critical are resolved

### Sign-Off Table

| Role | Tester | Sections | Status | Date |
|:-----|:-------|:---------|:-------|:-----|
| Admin | _____________ | A, B, E, F, G, H, I | ☐ Pass ☐ Fail | ___/___/___ |
| Professional | _____________ | A, C, E, F, G, H, I | ☐ Pass ☐ Fail | ___/___/___ |
| Client | _____________ | A, D, E, F, G, H, I | ☐ Pass ☐ Fail | ___/___/___ |

**Overall UAT Result:** ☐ **Accepted** ☐ **Accepted with conditions** ☐ **Not accepted**

**Notes:**

_______________________________________________________________________

_______________________________________________________________________

_______________________________________________________________________
