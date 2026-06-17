const crypto = require('crypto');

// Unambiguous alphabet — no 0/O/1/l/I to make hand-off readable.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// CSPRNG-generated throwaway password handed to a new staff member.
// 16 chars over a 56-char alphabet ≈ 93 bits of entropy. The account is
// flagged must_reset_password, so this is only valid until first login.
function generateTempPassword(length = 16) {
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return pw;
}

module.exports = { generateTempPassword };
