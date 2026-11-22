/**
 * Adversarial Security Test Specification ("Dirty Dozen")
 * Verifies all 12 hostile payloads are rejected by DRAFT_firestore.rules / firestore.rules.
 */
export const dirtyDozenPayloads = [
  {
    name: '1. Shadow Field Injection on Wizard Create',
    path: '/wizards/userA',
    operation: 'create',
    payload: { uid: 'userA', name: 'Harry', age: 17, house: 'Gryffindor', school: 'Hogwarts', bloodStatus: 'Half-blood', wandCore: 'Phoenix feather', wandWood: 'Holly', spellLockHash: '', spellLockSalt: '', spellLockHint: '', duelWins: 0, duelLosses: 0, umbridgeDefeatedCount: 0, isAdmin: true },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '2. Identity Spoofing on Wizard Create',
    path: '/wizards/userA',
    operation: 'create',
    authUid: 'userA',
    payload: { uid: 'userB' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '3. Unverified Email Bypass',
    path: '/wizards/userA',
    operation: 'create',
    emailVerified: false,
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '4. Path ID Poisoning',
    path: '/wizards/userA/entries/invalid$id$with$symbols',
    operation: 'create',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '5. Oversized Entry Content (>20000 chars)',
    path: '/wizards/userA/entries/entry1',
    operation: 'create',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '6. Invalid House Enum',
    path: '/wizards/userA',
    operation: 'create',
    payload: { house: 'IlvermornyHorned' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '7. Client-Fabricated Timestamp',
    path: '/wizards/userA',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '8. Immortal Field Mutation (createdAt/ownerId)',
    path: '/wizards/userA/entries/entry1',
    operation: 'update',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '9. Type Poisoning on duelWins',
    path: '/wizards/userA',
    operation: 'update',
    payload: { duelWins: '999' },
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '10. Orphaned DiaryEntry without Parent WizardProfile',
    path: '/wizards/nonExistentUser/entries/entry1',
    operation: 'create',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '11. Cross-Tenant Entry Listing',
    path: '/wizards/victim/entries',
    operation: 'list',
    authUid: 'attacker',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '12. ScrollQuery Post-Creation Mutation',
    path: '/wizards/userA/scrollQueries/q1',
    operation: 'update',
    expected: 'PERMISSION_DENIED'
  }
];
