# Smart Campus — Demo Data Guide & Seeding Protocol

> **Branch:** `feat/student-portal-refinements`
> **Database:** SQLite (`data/campus.db`)

---

## 1. Demo Student: Gaurav

The application includes an official, realistic demonstration student account.

### Account Attributes
- **Full Display Name:** `Gaurav`
- **Roll Number / Student ID:** `2024CS0042`
- **Official Institutional Email:** `gaurav.cs@smartcampus.edu`
- **Department:** `Computer Science & Engineering`
- **Academic Standing:** Year 2, Semester 4
- **Program:** B.Tech Computer Science & Engineering
- **Current CGPA:** 8.8 / 10.0
- **Attendance Standing:** ~85.4% (Compliance Safe, above the 75% threshold)
- **Role:** `student` (Standard student privileges only; never admin or elevated role)
- **Strict Constraint:** Gaurav is strictly a student user for demonstration. No UI copy, bio, note, or code comment states or implies that Gaurav developed the system.

### Demo Student Credentials (Demo Environment Only)
- **Login Identifier:** `2024CS0042`
- **Password:** `student123`

---

## 2. Realistic Seed Coverage

Running `node server/seed.js` or `node server/seed.js --reset` seeds the following data:

1. **Academic Years 1 to 4:**
   - 10 Year 2 CSE Students (including Gaurav `2024CS0042`).
   - 10 Year 2 IT Students.
   - Core curriculum subjects across all 8 semesters (Years 1 to 4).
2. **Attendance History:**
   - 45 days of realistic attendance logs for Gaurav (Present, Absent, Weekend breaks, and official institution holidays such as Gandhi Jayanti).
   - Biometric methods recorded: `face`, `rfid`, `qr`.
3. **Study Materials Across 4 Academic Years:**
   - Year 1 (Sem 1 & 2): Engineering Mathematics, Physics, Programming in C.
   - Year 2 (Sem 3 & 4): Design & Analysis of Algorithms, Operating Systems, Database Management Systems, Theory of Computation.
   - Year 3 (Sem 5 & 6): Computer Networks, Artificial Intelligence, Compiler Design.
   - Year 4 (Sem 7 & 8): Machine Learning, Cloud Computing, Distributed Systems.
4. **Faculty Directory:**
   - 5 departmental faculty members with authentic institutional cabin locations (e.g. `Block A, Room 301`), official consultation office hours (e.g. `Mon-Thu 14:00 - 16:00`), and official emails (`@smartcampus.edu`).
5. **Smart Parking:**
   - 24 designated parking slots across North Bay (Zone A) and South Bay (Zone B).
   - Sample vehicle registration for Gaurav (`KA-01-EQ-9988`).
6. **Career Placements:**
   - Sample opportunities with clear eligibility thresholds and interview tracker.

---

## 3. How to Run & Reset Seeding

### Idempotent Startup Seed
The application automatically checks if records exist on startup. If records exist, it does not overwrite or duplicate data.

### Manual Reset & Re-Seed
To reset and regenerate deterministic demo data:

```powershell
Set-Location C:\gaurav
node server/seed.js --reset
```

### Running Tests
To run the automated regression and DOM validation suite:

```powershell
npm test
```
