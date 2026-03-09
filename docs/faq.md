---
layout: default
title: FAQ
nav_order: 9
---

# Frequently Asked Questions

---

## Authentication

### I didn't receive my verification code
- Verify you entered the correct phone number
- Check that your phone can receive SMS messages
- Wait a minute — delivery can occasionally be delayed
- Return to the login page and request a new code

### My verification code isn't working
- Codes expire after **5 minutes** — request a new one if yours has expired
- Make sure you're entering all 6 digits
- Ensure you're using the most recent code (if you requested multiple)

### Can I log in with email instead of phone?
No. Ward uses phone-based authentication exclusively. Your phone number is your login credential.

---

## Account & Setup

### How do I become a Professional or Admin?
During account setup, enter the appropriate **role password** in the Role Password field. Get this password from your organization's admin.

### Can I change my role after setup?
You cannot change your own role. An admin can change your role from the [User Management](admin/users) page.

### How do I update my name or email?
Contact your administrator to update your account details.

### I picked the wrong role during setup
Contact your admin — they can change your role from the admin dashboard.

---

## Booking (Clients)

### I don't see any available timeslots
Possible reasons:
- **No active events** — there may not be an event running on the selected date
- **No professional shifts** — professionals haven't booked shifts for that date yet
- **Fully booked** — all timeslots have been reserved
- **Blackout period** — certain hours may be blocked

Try a different date or check back later.

### Can I choose which professional I see?
No. Ward automatically assigns a professional based on availability to ensure fair distribution.

### Can I book multiple appointments?
Yes. You can book as many appointments as there are available timeslots.

### How do I cancel an appointment?
Go to **My Appointments**, find the booking, and click **Cancel**. You'll receive a confirmation email.

### My appointment was changed — what happened?
An admin may have reassigned your booking to a different professional or timeslot. Check your email for updated details.

---

## Shifts (Professionals)

### I can't create a shift — it says the resource is unavailable
The resource may be at full capacity for that time period. Each resource has a maximum number of professionals that can be booked simultaneously. Try:
- A different time slot
- A different resource
- Checking with your admin about resource capacity

### Can I cancel a shift that has bookings?
No. Shifts with active client bookings cannot be cancelled directly. Ask your admin to reassign or cancel the bookings first.

### How do clients get assigned to my shifts?
When a client books a timeslot that falls within your shift, the system may automatically assign them to you. Assignment is random across all professionals with availability for that timeslot.

---

## Settings

### My times look wrong
Check your **timezone setting** in [User Settings](settings). The default is America/Chicago (US Central). All times throughout the app are displayed in your configured timezone.

### How do I switch to dark mode?
Go to [User Settings](settings) and select **Dark** under the Theme option. You can also choose **System** to match your device's preference.

---

## Email & Notifications

### I'm not getting any emails
- Verify you have an **email address** on file (check your profile)
- Check your **spam/junk folder**
- Ask your admin to run an [Email Connectivity Test](admin/settings#email-connectivity-test) to verify the email system is working
- Ensure the admin hasn't disabled email notifications system-wide

### How do I stop receiving emails?
Click the **unsubscribe link** in any email footer, or remove your email address from your account.

### When do appointment reminders arrive?
Reminders are sent at **8:00 AM Central Time** on the morning of your appointment.

---

## Privacy & Security

### Who can see my information?
- **Admins** can see all user information (name, phone, email, role)
- **Professionals** can see the name and contact info of clients booked on their shifts
- **Clients** can see the name of their assigned professional after booking
- Other clients cannot see your information

### How is my phone number used?
Your phone number is used exclusively for authentication (SMS verification codes). It is not shared with other users for communication purposes.

### Can I delete my account?
Contact your admin to request account deletion. Account deletion is handled through the admin [User Management](admin/users) page.
