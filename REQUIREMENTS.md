# Software Requirements Specification: Capacity-First Auto-Matching Scheduler

## 1. Project Overview & Scope
* **App Concept:** A two-sided scheduling application where professional availability is strictly constrained by physical resource capacity, and clients are auto-matched to professionals based on timeslot selection.
* **Core Problem Solved:** Existing schedulers are "person-centric" and ignore facility capacity constraints. This app is "timeslot-centric" and "resource-constrained."
* **Primary Target Audience:** Professionals (providing a homogenous service), Clients (receiving the service), and Facility Admins.
* **Key Differentiator:** A two-step availability loop. Professionals must first book a physical "Resource" (e.g., a room, a station) to generate availability. Clients then pick from a pool of available timeslots, and the system auto-assigns an available Professional.

## 2. Tech Stack Decisions
* **Frontend/Backend:** Next.js (App Router) with Server Actions.
* **Database:** PostgreSQL.
* **ORM:** Prisma.
* **Styling:** Tailwind CSS + Shadcn UI components.
* **Authentication:** NextAuth with Twilio custom provider for phone/SMS verification (5-minute codes).

### Authentication Flow

1. **Phone Number Entry:** User enters phone number on login page
2. **Code Generation & Sending:** System uses Twilio Verify API to generate and send a 5-minute one-time code via SMS
3. **Code Verification:** User enters the code; system verifies via Twilio Verify
4. **Session Creation:** Upon successful verification, NextAuth creates a session:
   - New users are automatically registered with their phone number
   - Existing users are matched by phone number
5. **Role Assignment:** During first registration, user selects role (Professional or Client). Admin roles must be assigned by existing admins.
6. **Session Management:** NextAuth handles session cookies, secure routes, and role-based access control

## 3. User Roles & Permissions
| Role | Core Actions | Data Access Boundaries |
| :--- | :--- | :--- |
| **Admin** | Creates "Resources" (the physical capacity limits of the facility). | Full access to all facility, professional, and client data. |
| **Professional** | Books Resources to create their "Shifts" (availability). | Can view available Resources. Can view their own assigned Client bookings. |
| **Client** | Selects a timeslot and receives a service. | Can only view aggregated timeslots. Cannot see individual Professional schedules. |

## 4. Core User Flows
* **Flow 1: Professional Capacity Booking (Creating Availability)**
  1. Professional logs in and views a calendar of the Facility.
  2. System queries total `Resources` minus `Resources currently booked` for a given day/time.
  3. Professional claims a Resource for a specific time block (e.g., Station 1 from 9:00 AM to 1:00 PM).
  4. **Backend Action:** System generates a `Shift` record. This `Shift` represents bookable inventory for Clients.

* **Flow 2: Client Auto-Match Booking (The Timeslot-Centric UI)**
  1. Client navigates to the booking page. 
  2. **UI Requirement:** Client sees a list of *Timeslots* (e.g., 9:00 AM, 9:30 AM), NOT a list of people.
  3. **Backend Action:** System aggregates all `Shifts` with unbooked time. If 3 Professionals are working at 9:00 AM, the 9:00 AM timeslot shows as available. 
  4. Client selects 9:00 AM and confirms.
  5. **Auto-Match Logic:** The backend finds an available Professional working a `Shift` at 9:00 AM who does not already have a `Booking`.
  6. System creates a `Booking` tying the Client, the Professional, and the Timeslot together.

## 5. Database Schema (Entities & Relationships)

### Entities

* **`User` (Base Table)**
  * `id` (UUID, PK)
  * `name` (String)
  * `phoneNumber` (String, Unique, Required) - Primary identifier for authentication
  * `email` (String, Unique, Optional)
  * `role` (Enum: ADMIN, PROFESSIONAL, CLIENT)
  * `createdAt` (DateTime)
  * `updatedAt` (DateTime)

* **`Resource` (The Capacity Constraint)**
  * `id` (UUID, PK)
  * `name` (String, e.g., "Station 1")
  * `description` (String, Optional)
  * `isActive` (Boolean)
  * `deletedAt` (DateTime, Nullable) - Soft deletion
  * `createdAt` (DateTime)
  * `updatedAt` (DateTime)

* **`Shift` (Professional Availability)**
  * `id` (UUID, PK)
  * `professionalId` (FK -> User.id)
  * `resourceId` (FK -> Resource.id)
  * `startTime` (DateTime)
  * `endTime` (DateTime)
  * `deletedAt` (DateTime, Nullable) - Soft deletion
  * `createdAt` (DateTime)
  * `updatedAt` (DateTime)

* **`Booking` (The Client Appointment)**
  * `id` (UUID, PK)
  * `clientId` (FK -> User.id)
  * `shiftId` (FK -> Shift.id)
  * `startTime` (DateTime)
  * `endTime` (DateTime)
  * `status` (Enum: CONFIRMED, CANCELLED) - Default: CONFIRMED
  * `notes` (String, Optional)
  * `deletedAt` (DateTime, Nullable) - Soft deletion
  * `createdAt` (DateTime)
  * `updatedAt` (DateTime)

### Constraints & Business Rules

1. **Time Slot Granularity:**
   - Client bookings use fixed 30-minute intervals
   - Shift durations must be multiples of 30 minutes

2. **User Constraints:**
   - `phoneNumber` must be unique and required
   - `role` must be one of ADMIN, PROFESSIONAL, CLIENT

3. **Shift Constraints:**
   - A Resource cannot be double-booked by two Professionals at overlapping times
   - A Professional cannot have overlapping Shifts (cannot be in two places at once)
   - `endTime` must be greater than `startTime`
   - Shift duration must be a multiple of 30 minutes (enforced via application logic)

4. **Booking Constraints:**
   - A Shift cannot have overlapping Bookings
   - Booking `startTime` and `endTime` must be within the parent Shift's time boundaries
   - Booking duration must be exactly 30 minutes (one time slot)
   - `endTime` must be greater than `startTime`
   - Only one Booking per Client per time slot? (To be decided)

5. **Soft Deletion:** Resources, Shifts, and Bookings use `deletedAt` timestamps instead of hard deletion.

6. **Audit Trail:** All entities include `createdAt` and `updatedAt` timestamps.

### Indexes for Performance
- User: `phoneNumber` (unique), `email` (unique), `role`
- Resource: `isActive`, `deletedAt`
- Shift: `professionalId`, `resourceId`, `startTime`, `endTime`, `deletedAt`
- Booking: `shiftId`, `clientId`, `startTime`, `deletedAt`, `status`

## 6. Auto-Matching Algorithm Rules

* **Time Slot Definition:** All client bookings use fixed 30-minute time slots (e.g., 9:00-9:30, 9:30-10:00). Shifts are multiples of 30 minutes.

* **Aggregation:** When displaying timeslots to a Client, the system must:
  1. Find all active `Shifts` (not deleted) that cover the time slot
  2. Subtract `Bookings` with status `CONFIRMED` (cancelled bookings don't occupy capacity)
  3. If `(Total concurrent Shifts) - (Total concurrent CONFIRMED Bookings) > 0`, the timeslot is available

* **Assignment Strategy (MVP):** Random Assignment. When a Client selects a valid timeslot:
  1. Query all available, unbooked `Shifts` for that specific 30-minute slot
  2. Randomly select one `Shift` from that pool (using `ORDER BY RANDOM() LIMIT 1` in PostgreSQL)
  3. Create a `Booking` with status `CONFIRMED` tied to that Shift

* **Concurrency Handling:** The system must handle race conditions:
  - Use database transactions with appropriate locking
  - If two Clients select the same timeslot simultaneously and only one `Shift` remains, ensure only one Booking succeeds
  - The other Client receives an "unavailable" error and should refresh available timeslots

## 7. Development Rules & Instructions for Claude
1. **Zero-Assumption Policy:** If a requirement or edge case is ambiguous, stop and ask me for clarification before writing code.
2. **Acknowledge Architecture:** Read the schema and flows carefully. Confirm you understand the difference between a `Shift` (booking a Resource) and a `Booking` (client appointment) before writing code.
3. **Database First:** Begin by writing the Prisma/Drizzle schema for the entities listed in Section 5. Show me the schema for approval before building the frontend or server actions.
4. **Complex Queries:** The hardest part of this app is the query that aggregates available timeslots for the Client UI. We will write and test this database query in isolation before wiring it to the UI.
5. **Randomization Query:** For the random assignment logic, ensure your database query uses an efficient method for selecting a random row (e.g., `ORDER BY RANDOM() LIMIT 1` in PostgreSQL or its ORM equivalent) to assign the booking.
6. **UI Design:** Ensure the Client-facing booking interface completely abstracts the Professionals. The UI should look like booking a movie ticket (picking a showtime), not like picking a specific person.
7. **Step-by-Step Execution:** Do not write the entire application in one massive block. Work in phases, starting with the database, moving to backend queries, and finishing with UI implementation.
