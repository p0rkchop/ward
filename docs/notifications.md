---
layout: default
title: Notifications
nav_order: 7
---

# Notifications

Ward sends email and SMS notifications to keep users informed about their appointments, account changes, and system events.

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

Email notifications are sent via **Resend** for booking and account events. Emails are only sent to users who have an email address on file.

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

## Opting Out

### SMS
Reply **STOP** to any SMS message to opt out. Authentication codes will still be sent.

### Email
Each email includes an unsubscribe link in the footer. You can also remove your email from your profile to stop all email notifications.
