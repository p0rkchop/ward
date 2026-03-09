---
layout: default
title: Events
parent: Admin Guide
nav_order: 2
---

# Event Management

Events are the core organizational unit in Ward. An event defines a date range during which professionals can book shifts and clients can book appointments.

---

## Creating an Event

To create a new event:

1. Navigate to **Events** from the admin nav
2. Click **Create Event**
3. Fill in the event details:

| Field | Required | Description |
|:------|:--------:|:------------|
| **Name** | Yes | Display name for the event |
| **Description** | No | Additional details about the event |
| **Start Date** | Yes | First day of the event |
| **End Date** | Yes | Last day of the event |
| **Default Start Time** | Yes | Default daily start time (e.g., 9:00 AM) |
| **Default End Time** | Yes | Default daily end time (e.g., 5:00 PM) |
| **Timezone** | Yes | Timezone for the event schedule |
| **Professional Password** | Yes | Password professionals must know to book shifts for this event |

4. Click **Save**

{: .important }
The **Professional Password** gates access to your event. Share it only with authorized professionals. Professionals enter this password during their account setup to gain the Professional role.

---

## Event List

The events page shows all events with:

- Event name and date range
- Active/inactive status
- Admin who created the event
- Quick actions (view, edit, delete)

You can sort and filter the list to find specific events.

---

## Configuring Event Days

Each event automatically generates days based on the start and end date range. You can customize individual days:

### Custom Day Hours

Override the default start/end times for specific days:

1. Open the event detail page
2. Find the day you want to customize
3. Set custom start and end times
4. Save changes

This is useful when some event days have different hours than others.

### Blackout Periods

Add blackout periods to block specific time ranges within a day (e.g., lunch breaks, setup time):

1. Open the event day configuration
2. Click **Add Blackout**
3. Set the start and end time for the blocked period
4. Optionally add a description (e.g., "Lunch Break")
5. Save

{: .note }
Professionals cannot book shifts during blackout periods. Existing shifts that overlap with a new blackout are not automatically cancelled — manage those manually.

---

## Assigning Resources to Events

Resources must be assigned to an event before professionals can book shifts on them.

1. Open the event detail page
2. Find the **Resources** section
3. Click **Assign Resource**
4. Select from available resources
5. The resource is now available for professional shift booking during this event

To remove a resource from an event:

1. Find the resource in the event's resource list
2. Click **Unassign**

{: .warning }
Unassigning a resource does not automatically cancel shifts or bookings on that resource. Handle existing bookings before unassigning.

---

## Agenda View

The Agenda view provides a comprehensive calendar drill-down for an event:

- **All event days** with their configured hours
- **Blackout periods** clearly marked
- **Professional shifts** showing who's booked on which resource and when
- **Client bookings** assigned to each shift
- **Real-time capacity** view per resource

Access the Agenda view from the event detail page → **Agenda** tab.

Use this view to:
- Verify coverage across all resources and time periods
- Identify gaps where no professional has booked shifts
- See which clients are booked and when
- Monitor resource utilization

---

## Event Bookings View

The Bookings view shows a detailed list of all client bookings for an event:

- Client name and contact info
- Appointment time and duration
- Assigned professional
- Resource and location
- Booking status

### Admin Booking Actions

As an admin, you can:

- **Reassign a booking** — Move a client to a different professional or timeslot. The client receives an email notification about the change.
- **Cancel a booking** — Remove a client's booking. The client receives a cancellation email.

{: .note }
These actions trigger automatic email notifications to the affected client. Make sure the action is intentional before confirming.

---

## Editing an Event

To edit an existing event:

1. Find the event in the event list
2. Click on the event or the edit action
3. Modify any fields
4. Save your changes

---

## Deleting an Event

To delete an event:

1. Find the event in the event list
2. Click the delete action
3. Confirm the deletion

{: .warning }
Deleting an event is a soft-delete. The event and its associated data are marked as deleted but retained in the database.
