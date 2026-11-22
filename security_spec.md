# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Wizard Ownership**: A `WizardProfile` at `/wizards/{userId}` can only be read, created, or updated by the verified authenticated user whose `request.auth.uid == userId` and `data.uid == request.auth.uid`.
2. **Master Gate for Subcollections**: A `DiaryEntry` at `/wizards/{userId}/entries/{entryId}` or `ScrollQuery` at `/wizards/{userId}/scrollQueries/{queryId}` cannot be created or modified unless the parent `/wizards/{userId}` profile exists and is owned by `request.auth.uid`.
3. **Strict Schema & No Shadow Fields**: All writes enforce `keys().hasAll(...) && keys().hasOnly(...)` on `create` and `affectedKeys().hasOnly(...)` on `update` alongside `isValid[Entity](incoming())`.
4. **Temporal & Identity Immortality**: `createdAt`, `uid`, and `ownerId` are immutable after creation; `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
5. **No Blanket List Scraping**: `list` rules explicitly bind `resource.data.ownerId == request.auth.uid` (or `resource.data.uid == request.auth.uid`) without calling `get()` inside `list`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Wizard Create**: Including `"isAdmin": true` in `/wizards/{uid}` -> Must fail `keys().hasOnly(...)`.
2. **Identity Spoofing on Wizard Create**: Setting `uid: "other-user-uid"` under `/wizards/{myUid}` -> Must fail `data.uid == request.auth.uid`.
3. **Unverified Email Bypass**: Attempting write with `email_verified: false` -> Must fail `isSignedIn()`.
4. **Path ID Poisoning**: Creating `/wizards/{uid}/entries/${"a".repeat(200)}` or invalid characters `bad$id` -> Must fail `isValidId()`.
5. **Denial of Wallet Oversized Content**: Writing a 25,000-char string in `DiaryEntry.content` -> Must fail `content.size() <= 20000`.
6. **Invalid House Enum**: Setting `house: "Durmstrang"` on `WizardProfile` -> Must fail house allowlist.
7. **Timestamp Forgery**: Providing a client-fabricated past `createdAt` instead of `serverTimestamp()` (`request.time`) -> Must fail `data.createdAt == request.time`.
8. **Immortal Field Mutation**: Updating `createdAt` or `ownerId` on an existing `DiaryEntry` -> Must fail immutability check.
9. **Action-Gap Type Poisoning**: Updating `duelWins` to `"999"` (string) instead of integer -> Must fail `isValidWizard(incoming())`.
10. **Orphaned Subcollection Write**: Creating a `DiaryEntry` when parent `/wizards/{userId}` does not exist -> Must fail Master Gate `get(...)`.
11. **Cross-Tenant Read/List**: Reading or listing `/wizards/{victimUid}/entries` as `attackerUid` -> Must fail `request.auth.uid == userId && resource.data.ownerId == request.auth.uid`.
12. **Unpermitted Field Update**: Trying to overwrite `duelWins` during a profile edit that only permits character fields, or mutating `ScrollQuery` after creation -> Must fail action `affectedKeys().hasOnly(...)` / `allow update: if false`.
