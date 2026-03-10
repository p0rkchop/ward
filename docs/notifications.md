---
layout: default
title: Notifications
nav_order: 7
---

# Notifications

Ward sends email, push, and SMS notifications to keep users informed about their appointments, account changes, and system events. Clients and professionals can independently control whether they receive **email notifications**, **push notifications**, or both from the **Settings** page.

---

## SMS Notifications

SMS messages are sent via **Twilio** for authentication purposes only:

| Trigger | Recipient | Content |
|:--------|:----------|:--------|
| Login attempt | User | 6-digit verification code |

{: .note }
You can opt out of SMS by replying **STOP** to any message. However, verification codes are still sent even after opting out (required for authentication).

---

## Email Notifications

Email notifications are sent via **Resend** for booking and account events. Emails are only sent to users who have an email address on file **and** have email notifications enabled (on by default).

### Client Notifications

| Trigger | When | What You Receive |
|:--------|:-----|:-----------------|
| **Welcome** | After completing account setup | Welcome email with role information |
| **Booking Confirmation** | After booking a timeslot | Appointment details (date, time, professional, resource, location) |
| **Self-Cancellation** | After you cancel your own booking | Cancellation confirmation |
| **Admin Cancellation** | When an admin cancels your booking | Notification that your booking was removed |
| **Booking Reassignment** | When an admin moves your booking | Updated appointment details (new professional/timeslot) |
| **Appointment Reminder** | Morning of your appointment (8 AM CT) | Reminder with appointment details |
| **Role Change** | When an admin changes your role | Notification of new role assignment |
| **Account Deletion** | When an admin deletes your account | Notification of account removal |

### Professional Notifications

| Trigger | When | What You Receive |
|:--------|:-----|:-----------------|
| **Welcome** | After completing account setup | Welcome email with role information |
| **New Booking** | When a client books on your shift | Client name and appointment details |
| **Booking Cancelled** | When a booking on your shift is cancelled | Notification of freed timeslot |
| **Appointment Reminder** | Morning of appointments (8 AM CT) | Reminder with day's schedule |
| **Role Change** | When an admin changes your role | Notification of new role assignment |

### Admin Notifications

| Trigger | When | What You Receive |
|:--------|:-----|:-----------------|
| **Welcome** | After completing account setup | Welcome email with role information |
| **Role Change** | If another admin changes your role | Notification of new role assignment |

---

## Reminder Schedule

Appointment reminders are sent daily at **8:00 AM Central Time** via an automated cron job. Reminders are sent for appointments occurring that day.

Both clients and professionals with upcoming appointments receive reminders.

---

## Email Requirements

To receive email notifications:

1. **Provide an email** during account setup or ask your admin to add one
2. **Verify your email provider allows delivery** — check spam/junk folders if emails aren't arriving

{: .note }
Email is optional but strongly recommended. Without an email on file, you will not receive booking confirmations, cancellations, or reminders.

---

## Push Notifications

Ward supports **browser push notifications** using the Web Push Protocol (VAPID). Push notifications are available to **clients** and **professionals** only.

### How to Enable

There are two ways to enable push notifications:

1. **Opt-in Banner** — When you first visit your dashboard, a banner asks if you'd like to enable push notifications. Click **Enable** to grant browser permission and subscribe.
2. **Settings Page** — Go to **Settings → Notification Preferences** and toggle push notifications on. If your browser hasn't granted permission yet, you'll be prompted.

{: .note }
Push notifications require a modern browser that supports the Push API (Chrome, Firefox, Edge, Safari 16+). If your browser doesn't support push, the option will not appear.

### Push Notification Events

Push notifications mirror the same booking events as email:

#### Client Push Notifications

| Trigger | When | Notification Content | Click Destination |
|:--------|:-----|:---------------------|:------------------|
| **Booking Confirmed** | After booking a timeslot | Appointment details | My Appointments |
| **Self-Cancellation** | After you cancel your own booking | Cancellation confirmation | My Appointments |
| **Admin Cancellation** | When an admin cancels your booking | Notification of removal | My Appointments |
| **Booking Reassignment** | When an admin moves your booking | Updated appointment details | My Appointments |
| **Appointment Reminder** | Morning of your appointment (8 AM CT) | Reminder with details | My Appointments |

#### Professional Push Notifications

| Trigger | When | Notification Content | Click Destination |
|:--------|:-----|:---------------------|:------------------|
| **New Booking** | When a client books on your shift | Client name and details | My Bookings |
| **Booking Cancelled** | When a booking on your shift is cancelled | Freed timeslot notification | My Bookings |
| **Appointment Reminder** | Morning of appointments (8 AM CT) | Reminder with schedule | Calendar |

### How It Works

1. When you enable push, your browser generates a unique subscription and sends it to Ward's server
2. Ward stores this subscription securely in the database
3. When a booking event occurs, Ward sends a push message to your browser via the Web Push Protocol
4. Your browser's **service worker** displays the notification, even if the Ward tab is closed
5. Clicking the notification opens Ward and navigates to the relevant page

### Managing Push Notifications

- **Turn off**: Go to **Settings → Notification Preferences** and toggle push off
- **Re-enable**: Toggle push back on from Settings (you may be prompted for browser permission again if it was revoked)
- **Browser-level block**: If you blocked notifications in your browser settings, Ward will show a message explaining how to unblock

{: .note }
Push subscriptions are automatically cleaned up if they become invalid (e.g., you clear browser data or revoke permission at the browser level).

---

## Opting Out

### SMS
Reply **STOP** to any SMS message to opt out. Authentication codes will still be sent.

### Email
Go to **Settings → Notification Preferences** and toggle email notifications off. You can also remove your email from your profile to stop all email notifications.

### Push
Go to **Settings → Notification Preferences** and toggle push notifications off. You can also revoke notification permission in your browser settings.
