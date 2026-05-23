# Firebase Security Specifications

This document defines the strict data invariants, security payloads, and target guidelines for securing the Smart Placement Preparation Platform's Firestore backend.

## 1. Data Invariants

- **User Profiles**: A user profile must match the authenticated user UID exactly. Only the user profile holder can modify their attributes.
- **Resumes**: Resumes must map directly to the creator's UID (`userId`). PII is isolated to authorized owners.
- **Aptitude Attempts**: Attempts are immutable after creation. Every attempt must record the genuine authenticated `userId`.
- **Coding Sandbox Sessions**: Code sessions can only be updated/modified by their original authentic owner.
- **Interview Logs**: Chat transcripts and scores correspond to the actual participant and cannot be hijacked or altered by third-party sessions.
- **Skill Evaluator Matrices**: Analytical performance metrics can only be registered for the authenticated individual.

---

## 2. The "Dirty Dozen" Payloads (Exploit Vector Simulations)

The following payload attempts represent typical exploit vectors that the security rules are designed to block completely:

1. **Privilege Escalation via Shadow Fields (Users)**
   Modify fields like `role` or `isAdmin` inside user profiles during self-registration or updates.
2. **Identity Spoofing (Users)**
   Create or write a user profile with an ID other than `request.auth.uid`.
3. **Ghost Resume Insertion**
   Create a resume profile where `userId` is another candidate's UID.
4. **Third-Party Resume Hijacking**
   Modify another candidate's resume score, code templates, or comments.
5. **Score Injection (Aptitude)**
   Submit an attempt for a logical reasoning question claiming a false `isCorrect` flag manually bypass.
6. **Time Spoofing (Aptitude)**
   Write negative values or massive sizing into `timeTaken` values.
7. **Sandbox Code Hijacking**
   Write code solution profiles targeting another candidate's session ID.
8. **Malicious Sizing Injection (Coding)**
   Submit code strings exceeding 64KB bounds to deplete system resources.
9. **Transcript Tampering (Interviews)**
   Modify historical transcripts or overwrite an interview score status under someone else's ID.
10. **Arbitrary Topic Override (Interview)**
    Submit state transitions for internal rating properties from a standard frontend request.
11. **Skill Metrics Overwrite**
    Tamper with DSS or Communication scores of standard mock assessments.
12. **PII Blanket Scanning**
    Attempt a blanket database-wide collection `get` query targeting lists of resume payloads or user profiles.

---

## 3. Security Rule Assertions

These validation cases verify that our Firestore rule structure effectively blocks all 12 exploits with `PERMISSION_DENIED`. Every assertion executes against zero-trust criteria before production deployment.
