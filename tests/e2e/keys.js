// TEST-ONLY constant for the local end-to-end harness. It is not a real credential.
const crypto = require('crypto');
const SECRET = 'e2e-jwt-secret-at-least-32-characters-long!!';
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (p) => { const h = b64(JSON.stringify({alg:'HS256',typ:'JWT'})); const pl = b64(JSON.stringify(p)); return `${h}.${pl}.${crypto.createHmac('sha256', SECRET).update(h+'.'+pl).digest('base64url')}`; };
const far = 4102444800;
console.log(`export JWT_SECRET='${SECRET}'`);
console.log(`export NEXT_PUBLIC_SUPABASE_ANON_KEY='${sign({role:'anon', iss:'e2e', exp: far})}'`);
console.log(`export SUPABASE_SERVICE_ROLE_KEY='${sign({role:'service_role', iss:'e2e', exp: far})}'`);
