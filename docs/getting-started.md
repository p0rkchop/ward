---
layout: default
title: Getting Started
nav_order: 2
---

# Getting Started

Ward uses phone-based authentication — no passwords to remember. You'll sign in with your phone number and a one-time SMS verification code.

---

## Signing In

### Step 1: Enter Your Phone Number

1. Navigate to the Ward login page
2. Enter your phone number in any format (e.g., `414-861-6375` or `4148616375`)
3. Click **Send Code**
4. A 6-digit verification code will be sent to your phone via SMS

### Step 2: Enter the Verification Code

1. You'll be redirected to the verification page
2. Your phone number is displayed for confirmation
3. Enter the 6-digit code from your SMS
4. Click **Verify**

{: .note }
Verification codes expire after **5 minutes**. If your code expires, return to the login page and request a new one.

{: .warning }
If you don't receive a code, check that you entered the correct phone number and that your phone can receive SMS messages.

---

## First-Time Setup

If this is your first time signing in, you'll be directed to the setup page to complete your profile.

### Required Information

| Field | Description |
|:------|:------------|
| **Full Name** | Your display name throughout the app |
| **Email** | Optional, but recommended — used for booking confirmations, cancellations, and reminders |
| **Role Password** | Optional — determines your access level (see below) |

### Role Assignment

Your role is determined during setup based on the **Role Password** field:

| If you enter... | You become a... | Access level |
|:----------------|:----------------|:-------------|
| Nothing (leave blank) | **Client** | Book appointments, manage your bookings |
| The professional password | **Professional** | Book resource shifts, manage client appointments |
| The admin password | **Admin** | Full system access — events, resources, users, settings |

{: .important }
Role passwords are set by your organization's administrator. If you need a professional or admin role, ask your admin for the appropriate password.

### After Setup

Once you complete setup, you'll be automatically redirected to your role-specific dashboard:

- **Admins** → Admin Dashboard
- **Professionals** → Professional Dashboard
- **Clients** → Client Dashboard

A welcome email will be sent to your email address (if provided).

---

## Your Profile

Access your profile anytime from the navigation menu. Your profile displays:

- **Name** — your display name
- **Phone Number** — the phone used for authentication
- **Role** — your current access level (Admin, Professional, or Client)
- **User ID** — your unique account identifier

From the profile page, you can also **sign out** to end your session.

---

## Role-Based Access

Ward enforces strict role-based access. You can only access pages designated for your role:

| Route | Admin | Professional | Client |
|:------|:-----:|:------------:|:------:|
| Admin Dashboard & Settings | ✅ | ❌ | ❌ |
| Professional Dashboard & Shifts | ❌ | ✅ | ❌ |
| Client Dashboard & Bookings | ❌ | ❌ | ✅ |
| User Settings & Profile | ✅ | ✅ | ✅ |

If you try to access a page outside your role, you'll see an **Unauthorized** page with options to return to your dashboard.

---

## Next Steps

- **Admins**: Head to the [Admin Guide](admin/) to learn about event and resource management
- **Professionals**: See the [Professional Guide](professional/) for shift booking
- **Clients**: Check the [Client Guide](client/) for appointment booking
- **All roles**: Configure your [display preferences](settings)
