---
layout: default
title: Resources
parent: Admin Guide
nav_order: 3
---

# Resource Management

Resources represent the bookable entities in your organization — rooms, tables, chairs, equipment, or any physical or logical unit that professionals use during their shifts.

---

## Creating a Resource

1. Navigate to **Resources** from the admin nav
2. Click **Create Resource**
3. Fill in the resource details:

| Field | Required | Description |
|:------|:--------:|:------------|
| **Name** | Yes | Display name (e.g., "Table 1", "Room A") |
| **Description** | No | Additional details about the resource |
| **Location** | No | Physical location (e.g., "Building B, Floor 2") |
| **Quantity** | Yes | Number of units available (default: 1) |
| **Professionals Per Unit** | Yes | Max professionals that can be assigned per unit (default: 1) |
| **Active** | Yes | Whether the resource is available for booking |

4. Click **Save**

---

## Understanding Capacity

Resource capacity is determined by two fields:

### Quantity

The number of physical units of this resource. For example:
- **5 tables** → quantity = 5
- **1 conference room** → quantity = 1

### Professionals Per Unit

The maximum number of professionals that can book a shift on each unit at the same time. For example:
- **1 professional per table** → professionalsPerUnit = 1
- **2 professionals per room** → professionalsPerUnit = 2

**Total capacity** = quantity × professionalsPerUnit

{: .note }
The system enforces capacity limits when professionals attempt to book shifts. If all units are occupied for a given time period, the shift cannot be created.

---

## Resource List

The resources page shows all resources with:

- Name, description, and location
- Capacity settings (quantity, professionals per unit)
- Active/inactive status
- Quick actions (edit, delete)

---

## Editing a Resource

1. Find the resource in the resource list
2. Click the edit action
3. Modify any fields
4. Save your changes

{: .note }
Changing capacity settings does not affect existing shifts. Only future shift bookings will be validated against the new capacity.

---

## Deleting a Resource

1. Find the resource in the resource list
2. Click the delete action
3. Confirm the deletion

{: .warning }
Deleting a resource is a soft-delete. Existing shifts and bookings on this resource remain intact but no new shifts can be created.

---

## Assigning Resources to Events

After creating resources, you need to assign them to events before professionals can book shifts. See [Event Management → Assigning Resources](events#assigning-resources-to-events) for details.
