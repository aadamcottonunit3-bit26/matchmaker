# CNIC encryption — proposal (nothing here has been applied; approval needed)

## 1. How CNIC data is stored today (verified in the code and schema)
- `public.profile_private.cnic_number` is a **plaintext** text column with a UNIQUE constraint (this is how duplicate registrations are stopped).
- CNIC images are files in the private bucket `cnic-documents`, not encrypted by the application.
- Access is already admin-only (table, Storage, API). Database backups and any SQL dump contain the plaintext number.
- Platform-level encryption at rest is provided by Supabase's infrastructure; check their current documentation. It does not protect against someone who can run SQL or has a dump.

## 2. What encryption would and would not protect
Protects: a leaked database dump or backup, a mistaken SQL export, a person with database access but without the application key.
Does not protect: an attacker who controls the website server (it holds the key), or an admin account that is taken over (admins can view CNICs by design).

## 3. Options considered
| Option | Verdict |
|--------|---------|
| **A. Application-level AES-256-GCM + a keyed HMAC "blind index" for duplicate checks** | **Recommended** |
| B. Supabase Vault / pgsodium column encryption | Possible; keys live next to the data on the database side and the feature set changes over time (verify the current docs before choosing) |
| C. One-way hash only | Rejected: admins must see the full number |
| D. Deterministic encryption / plain SHA-256 | Rejected: a CNIC is 13 digits with a known structure, so a plain hash can be brute-forced offline in minutes; only a **keyed** HMAC (key not in the database) is safe |

## 4. Recommended design (option A)
- New columns: `cnic_enc` (bytea: key id + random IV + ciphertext + GCM tag) and `cnic_hash` (text, UNIQUE) = `HMAC-SHA256(CNIC_HMAC_KEY, digits-only CNIC)`.
- Registration: encrypt, compute the hash, insert; duplicate check = look up `cnic_hash` (same neutral message as today). No plaintext is written once the switch is made.
- Admin pages: decrypt on the server only, per request, for the member being opened; the list shows the mask computed after decryption (no partial digits stored in the database).
- Admin search: **exact full-number** search via the hash; partial CNIC search would need an extra index and is not recommended (name, phone, registration number keep working).
- Keys: two independent 32-byte keys `CNIC_ENC_KEY`, `CNIC_HMAC_KEY` plus `CNIC_KEY_ID`, stored only as server-side Vercel environment variables (sensitive), never `NEXT_PUBLIC_`, never logged, never in the repository.

## 5. Key management, rotation, compromise
- **Rotation:** add key v2; new writes use v2; an admin-triggered batch job decrypts with the key named in each row and re-encrypts with v2 (and recomputes the HMAC); old keys stay available until the job reports zero v1 rows. During rotation the duplicate check looks up both hashes.
- **If only the database leaks:** CNICs stay protected.
- **If the encryption key leaks together with a dump:** CNICs are exposed → rotate both keys, re-encrypt, follow your legal notification duties.
- **If only the HMAC key leaks with a dump:** an attacker can test guessed CNICs against the hashes offline → rotate the HMAC key and recompute.
- **Key loss is permanent loss of all CNIC numbers** (the images are unaffected). Keep two copies (a password manager and a sealed offline copy), document who can access them, and test a restore on a staging project.

## 6. Backups and recovery
Old backups keep the plaintext until they age out of Supabase's backup window, so encryption protects new backups only after the plaintext is removed. Plan: after the plaintext is removed, keep the key escrow current, and rehearse "restore backup + apply keys" on staging.

## 7. Safe migration plan (additive and reversible; no data is lost at any step)
1. **Approval** of this design and key custody (see section 9).
2. **Staging first.** Migration adds nullable `cnic_enc`, `cnic_hash` (plaintext untouched). Code writes **both** plaintext and encrypted values.
3. **Backfill script** (service role, batches, idempotent): for every row, encrypt + hash, then **verify** `decrypt(cnic_enc) == cnic_number` and the hash matches; print counts; stop on any mismatch.
4. Switch **reads** (admin pages, duplicate check, search) to the encrypted columns; plaintext still present as the fallback.
5. After a trial period and a **second explicit approval**: make the uniqueness rely on `cnic_hash`, then clear/drop the plaintext column. Rollback after this point = a restore script that decrypts with the key and refills the plaintext.
6. Rotate the keys once as a rehearsal.

## 8. Impact
Members: none. Registration and admin verification: unchanged behaviour. Admin: full-number search only; slightly more work per page (one decrypt per CNIC shown).
CNIC **images**: optional later step (encrypt before upload and stream through an admin-only route). It removes signed-URL convenience and adds server load, so it is not part of this proposal; the files stay private, admin-only and short-link only.

## 9. Decisions I need from you
1. Approve option A? 2. Who holds and backs up the keys? 3. Is exact-number search enough (no partial search)? 4. Encrypt CNIC images as well, now or later? 5. When may the plaintext column be removed (after how long on staging/production)?
