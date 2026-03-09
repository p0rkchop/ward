---
layout: default
title: Book Appointment
parent: Client Guide
nav_order: 2
---

# Book an Appointment

The booking page lets you browse available timeslots and reserve an appointment.

---

## Booking Flow

### Step 1: Select a Date

1. Navigate to **Book Appointment** from the client nav
2. Use the calendar date picker to select your preferred date
3. The system loads available timeslots for that date

### Step 2: Browse Available Timeslots

Available timeslots are displayed for the selected date. Each timeslot shows:

- **Time range** (e.g., 9:00 AM – 9:30 AM)
- **Availability status** — available or fully booked

{: .note }
Timeslots are displayed in your configured timezone. If times seem off, check your [timezone setting](../settings).

### Step 3: Select a Timeslot

1. Click on an available timeslot
2. Review the appointment details
3. Click **Book** to confirm

### Step 4: Confirmation

Once booked:
- A **confirmation email** is sent to your email address (if provided)
- The appointment appears in your [My Appointments](appointments) list
- A professional is automatically assigned from those available during your timeslot

---

## How Timeslot Availability Works

The system calculates availability by:

1. **Aggregating all professional shifts** that cover the timeslot
2. **Subtracting existing bookings** from the total capacity
3. **Showing the timeslot as available** if remaining capacity > 0

This means you see the combined availability across all professionals — you don't need to know which specific professional will be assigned.

---

## Professional Assignment

When you book a timeslot:

- The system identifies all professionals with open capacity for that time
- A professional is **randomly assigned** to distribute bookings evenly
- You receive the professional's name in your confirmation email
- The assigned professional also receives a notification

{: .note }
You cannot select a specific professional. This ensures fair distribution and simplifies the booking experience.

---

## What If No Timeslots Are Available?

If you don't see any available timeslots for a date:

- **No professionals have shifts** — professionals haven't booked shifts for that date yet
- **All timeslots are full** — existing bookings have filled all capacity
- **The date is outside event hours** — the selected date may not have an active event
- **Blackout period** — the time may be blocked (e.g., lunch break)

Try selecting a different date or check back later as professionals add more shifts.

---

## Booking Conflicts

If you try to book a timeslot that fills up while you're selecting it, you'll see an **unavailable** error. Simply choose a different timeslot and try again.
