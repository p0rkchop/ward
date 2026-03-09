---
layout: default
title: Settings
parent: Admin Guide
nav_order: 6
---

# Admin Settings

The Admin Settings page provides system-wide configuration options. Access it from **Settings** in the admin navigation bar.

---

## Branding

### App Logo

Upload a custom logo that appears on the login page:

1. Click **Upload Image** or drag and drop an image
2. Preview the uploaded logo
3. The logo is saved automatically

**Image requirements:**
- File type: Any image format (PNG, JPG, SVG, etc.)
- Maximum file size: 4 MB
- Maximum dimensions: 4000 × 4000 pixels

To change the logo, upload a new image. To remove it, click the **Remove** button.

---

## General Settings

### Site Name

Customize the platform name displayed in navigation headers across all role dashboards.

1. Enter your desired site name
2. Click **Save**
3. The name updates immediately in all navigation bars

Default: **Ward**

### Timeslot Duration

Set the default duration for appointment timeslots:

| Option | Description |
|:-------|:------------|
| **15 minutes** | Short appointments |
| **30 minutes** | Standard appointments (default) |
| **45 minutes** | Extended appointments |
| **60 minutes** | Long appointments |

{: .important }
Changing the timeslot duration only affects **newly created shifts**. Existing shifts and bookings retain their original duration.

---

## Email Connectivity Test

Verify that email notifications are properly configured:

1. Enter a test email address
2. Click **Send Test Email**
3. The system runs a step-by-step connectivity test:
   - Server action validation
   - Email provider configuration check
   - Delivery attempt
4. Results display with green checkmarks (pass) or red marks (fail) for each step

Use this to verify your Resend email integration is working before relying on booking notifications.

---

## Danger Zone

{: .warning }
Actions in the Danger Zone are **destructive and irreversible**. Use with extreme caution.

### Reset All Data

Completely resets the Ward system to a clean state:

**What gets deleted:**
- All bookings
- All shifts
- All events and event days
- All resources
- All user accounts **except your admin account**
- App settings reset to defaults

**How to use:**

1. Click **Reset All Data**
2. Type the exact confirmation phrase: **I AM NOT AN IDIOT**
3. Click **Confirm Reset**
4. The system deletes all data and displays a summary of deleted records

{: .warning }
This action cannot be undone. It permanently removes all data from the system. Only use this for development/testing cleanup or when starting completely fresh.

---

## Notification Settings

Toggle email notifications on or off for the entire system:

- **Enabled** — booking confirmations, cancellations, reminders, and role changes send emails
- **Disabled** — no notification emails are sent (SMS verification codes still work)
