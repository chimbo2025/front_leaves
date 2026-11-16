// Avatar helper contract — run with: node --test scripts/avatar.test.mjs
// Exercises the same pure logic the React component and the Laravel model use,
// so the initials rule cannot drift between the two sides.
import assert from 'node:assert/strict'
import test from 'node:test'

const { initialsFromName, normalizeInitials, resolveAvatar, AVATAR_PLACEHOLDER } = await import('../lib/avatar.ts')

test('initials use the first letter of the first and last name', () => {
  assert.equal(initialsFromName('Haji Ali Said'), 'HS')
  assert.equal(initialsFromName('Asha Juma Hamisi'), 'AH')
  assert.equal(initialsFromName('Ali Hassan Juma'), 'AJ')
  assert.equal(initialsFromName('Fatma Omar'), 'FO')
})

test('initials are uppercase and at most two characters', () => {
  assert.equal(initialsFromName('haji ali said'), 'HS')
  assert.equal(initialsFromName('  Haji   Ali   Said  '), 'HS')
  assert.equal(initialsFromName('Haji Ali Said').length <= 2, true)
})

test('a single name contributes its first two letters', () => {
  assert.equal(initialsFromName('Asha'), 'AS')
  assert.equal(initialsFromName(' haji '), 'HA')
  assert.equal(initialsFromName('said'), 'SA')
})

test('missing names produce an empty string', () => {
  assert.equal(initialsFromName(null), '')
  assert.equal(initialsFromName(undefined), '')
  assert.equal(initialsFromName('   '), '')
})

test('apostrophes and hyphens stay inside the name', () => {
  assert.equal(initialsFromName("Nuhu's Said"), 'NS')
  assert.equal(initialsFromName('Amina-Hawa Nuhu'), 'AN')
})

test('stored initials are normalised to two uppercase letters', () => {
  assert.equal(normalizeInitials('hs'), 'HS')
  assert.equal(normalizeInitials('H S'), 'HS')
  assert.equal(normalizeInitials('---'), '')
  assert.equal(normalizeInitials(null), '')
})

test('a profile photo wins over initials', () => {
  const resolved = resolveAvatar({
    name: 'Haji Ali Said',
    initials: 'XX',
    photoUrl: '/storage/photos/haji.jpg',
  })
  assert.equal(resolved.kind, 'photo')
  assert.equal(resolved.value, '/storage/photos/haji.jpg')
})

test('initials render when there is no photo', () => {
  assert.deepEqual(resolveAvatar({ name: 'Haji Ali Said' }), { kind: 'initials', value: 'HS' })
  assert.deepEqual(resolveAvatar({ name: 'Asha', initials: 'AY' }), { kind: 'initials', value: 'AY' })
})

test('a placeholder renders when there is no photo, no initials and no name', () => {
  assert.deepEqual(resolveAvatar({}), { kind: 'placeholder', value: AVATAR_PLACEHOLDER })
  assert.equal(resolveAvatar({ name: null, initials: '' }).value, AVATAR_PLACEHOLDER)
})

test('the placeholder is a single visible character', () => {
  assert.equal(AVATAR_PLACEHOLDER.length, 1)
})
