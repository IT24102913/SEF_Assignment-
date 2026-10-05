# Architectural Decision Record (ADR 004): Consolidation to Real OPD Session Blocks & Per-Session Queue Numbering

## Status
**Accepted & Implemented**

## Context
In earlier iterations of the HealthBridge Doctor Channeling platform:
1. Consultations were generated as isolated hourly micro-sessions (e.g., 08:00–09:00, 09:00–10:00, etc.) with small per-hour caps.
2. In an attempt to prevent token collisions across the entire day, a day-wide counter infrastructure (`DoctorDailyQueueCounters` table and helper routines) was introduced.

Upon clinical workflow review against real-world private hospital OPD operations (e.g., Asiri, Nawaloka, Lanka Hospitals):
- Private medical consultants do not conduct isolated hourly appointments; they hold dedicated multi-hour clinic blocks (Morning, Evening, and select Night sessions for General Physicians).
- Patients receive sequential queue tokens scoped specifically to that session block (e.g., Token 1 to 25 for Morning; Token 1 to 25 for Evening), not a single global counter spanning the entire calendar day.
- For patient clarity, arrival advice instructs arrival prior to session start, and tokens are visually prefixed by session block (`M-01`, `E-07`, `N-03`).

## Decision

### 1. Consolidation to Standard OPD Clinic Blocks
- Introduced `SessionType` enum: `Morning`, `Evening`, `Night`.
- Configured standardized OPD clinic blocks across hospital consultants:
  - **Morning Session**: 08:30 AM – 12:00 PM (Capacity: 25 patients)
  - **Evening Session**: 04:30 PM – 07:30 PM (Capacity: 25 patients)
  - **Night Session**: 08:00 PM – 10:00 PM (Capacity: 15 patients)
- Specialty-specific scheduling:
  - **General Medicine / Physicians**: Offer Morning, Evening, and Night sessions.
  - **Specialist Consultants** (Cardiology, Neurology, Orthopaedics, Paediatrics, Gynaecology, Dermatology, ENT): Offer Morning and Evening sessions only.
- Dev/test seed generator completely replaced hourly generation with these realistic OPD session blocks.

### 2. Reversion of Queue Numbering to Atomic Per-Session Round-Trip
- Completely removed the redundant `DoctorDailyQueueCounters` table, entity model, and DbContext registration.
- Implemented single atomic SQL round-trip in `BookAppointmentAsync` via PostgreSQL `RETURNING`:
  ```sql
  UPDATE "DoctorSessions"
  SET "CurrentBookings" = "CurrentBookings" + 1
  WHERE "Id" = @sessionId AND "CurrentBookings" < "MaxCapacity" AND "IsActive"
  RETURNING "CurrentBookings";
  ```
- Guarantees 100% race-condition immunity, zero token collisions under concurrent booking requests, atomic capacity validation, and independent per-session numbering starting at `1`.

### 3. Derived Display-Only Session Label
- Computed derived label `{Prefix}-{QueueNumber:D2}`:
  - Morning: `M-01`, `M-02`, ...
  - Evening: `E-01`, `E-02`, ...
  - Night: `N-01`, `N-02`, ...
- Displayed across patient booking confirmation screens, My Appointments lists, QR check-in passes, and the Admin Master Channeling table.
- Patients are advised to arrive by session start time, reflecting true OPD channeling operations.

## Consequences & Verification
- **Simplicity**: Removed counter table maintenance, complex retries, and distributed concurrency issues.
- **Consistency**: The patient experience now matches standard Sri Lankan private hospital channeling workflows.
- **Verification**: Concurrency tests confirmed sequential, non-colliding tokens (`E-01`, `E-02`, `E-03`) and independent indexing across multiple sessions for the same doctor on the same date.
