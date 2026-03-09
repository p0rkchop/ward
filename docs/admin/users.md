---
layout: default
title: Users
parent: Admin Guide
nav_order: 4
---

# User Management

The Users page lets you view all registered users, manage their roles, and remove accounts when needed.

---

## User List

The users page displays all users with:

| Column | Description |
|:-------|:------------|
| **Name** | User's display name |
| **Phone** | Phone number used for authentication |
| **Email** | Email address (if provided) |
| **Role** | Current role — Admin, Professional, or Client |
| **Created** | Account creation date |

You can sort and filter by any column to find specific users.

---

## Changing a User's Role

To change a user's role:

1. Find the user in the user list
2. Select a new role from the role dropdown or action menu
3. Choose from: **Admin**, **Professional**, or **Client**
4. Confirm the change

When a role is changed:
- The user's access permissions update immediately on their next request
- An **email notification** is sent to the user informing them of the role change (if they have an email on file)
- The user will be redirected to their new role's dashboard on next login

{: .important }
Changing a user to Admin gives them full system access including the ability to modify other users, reset data, and change settings. Assign this role carefully.

---

## Deleting a User

To remove a user account:

1. Find the user in the user list
2. Click the delete action
3. Confirm the deletion

When a user is deleted:
- The account is **soft-deleted** (marked as deleted, not permanently removed)
- The user can no longer sign in
- An **email notification** is sent informing them of the account removal (if they have an email on file)
- Their existing bookings and shifts remain in the system for record-keeping

{: .warning }
You cannot delete your own admin account through the user management page.

---

## How Users Register

Users self-register through the login flow:

1. User enters their phone number on the login page
2. Verifies via SMS code
3. Completes the setup page (name, email, optional role password)
4. Role is assigned based on the password entered during setup

New users default to the **Client** role unless they enter a valid professional or admin password during setup.

---

## Monitoring User Activity

While the Users page shows account information, you can track user activity through:

- **Event Agenda** — see which professionals have booked shifts
- **Event Bookings** — see which clients have appointments
- **Analytics** — view system-wide user activity trends
