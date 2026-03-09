---
layout: default
title: Home
nav_order: 1
---

# Ward Documentation

Welcome to the user documentation for **Ward**, a modern appointment scheduling platform built for event-based resource booking.

Ward enables organizations to manage events, resources, and appointments with role-based access for administrators, professionals, and clients.

---

## Choose Your Role

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 2rem 0;">

<div style="flex: 1; min-width: 200px; padding: 1.5rem; border: 2px solid #9333ea; border-radius: 8px;">
<h3 style="color: #9333ea; margin-top: 0;">🟣 Admin</h3>
<p>Create events, manage resources, oversee users, and configure system settings.</p>
<p><a href="admin/">Admin Guide →</a></p>
</div>

<div style="flex: 1; min-width: 200px; padding: 1.5rem; border: 2px solid #3b82f6; border-radius: 8px;">
<h3 style="color: #3b82f6; margin-top: 0;">🔵 Professional</h3>
<p>Book resource shifts to create availability and manage assigned client appointments.</p>
<p><a href="professional/">Professional Guide →</a></p>
</div>

<div style="flex: 1; min-width: 200px; padding: 1.5rem; border: 2px solid #22c55e; border-radius: 8px;">
<h3 style="color: #22c55e; margin-top: 0;">🟢 Client</h3>
<p>Browse available timeslots, book appointments, and manage your bookings.</p>
<p><a href="client/">Client Guide →</a></p>
</div>

</div>

---

## Quick Links

| Topic | Description |
|:------|:------------|
| [Getting Started](getting-started) | Login, verification, and account setup |
| [User Settings](settings) | Theme, timezone, date & time format preferences |
| [Notifications](notifications) | Email and SMS notification reference |
| [FAQ](faq) | Common questions and troubleshooting |
| [User Acceptance Testing](uat) | UAT checklists and sign-off process |

---

## How Ward Works

1. **Admins** create events with date ranges and assign resources (rooms, tables, equipment)
2. **Professionals** book shifts on those resources during event hours, creating availability
3. **Clients** see aggregated available timeslots and book appointments — the system auto-assigns a professional

All users authenticate via phone number with SMS verification. No passwords required.
