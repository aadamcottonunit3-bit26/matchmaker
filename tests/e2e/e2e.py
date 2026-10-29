import os, re, json, subprocess, urllib.request, io
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"
from playwright.sync_api import sync_playwright
from PIL import Image

BASE, MOCK = "http://localhost:3077", "http://localhost:54321"
A, B, C, AD = ("00000000-0000-0000-0000-0000000000%s" % x for x in ("0a", "0b", "0c", "ad"))
ANON = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
NEUTRAL = "If an account exists for this email address"
results, csp_msgs = [], []

def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS" if cond else "FAIL"), "|", name, ("(%s)" % str(detail)[:160] if (detail and not cond) else ""))

def get(url, headers=None, data=None, method=None):
    req = urllib.request.Request(url, headers=headers or {}, data=data, method=method)
    try:
        with urllib.request.urlopen(req) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, e.read()

def mails(to): return json.loads(get(f"{MOCK}/__mail?to={to}")[1])
def psql(sql): return subprocess.run(["su", "postgres", "-c", f"psql -X -q -tA -d e2e -c \"{sql}\""], capture_output=True, text=True).stdout.strip()

def watch(page):
    page.on("console", lambda m: csp_msgs.append((page.url, m.text)) if ("Content Security Policy" in m.text or "Refused to" in m.text) else None)

def settle(page, ms=700):
    try: page.wait_for_load_state("networkidle", timeout=8000)
    except Exception: pass
    page.wait_for_timeout(ms)

def login(page, email, pw):
    page.goto(BASE + "/login"); watch(page)
    page.fill("input[name=email]", email); page.fill("input[name=password]", pw)
    page.click("button:has-text('Login')"); settle(page, 1200)

def forgot(page, email):
    page.goto(BASE + "/forgot-password"); watch(page)
    page.fill("input[name=email]", email); page.click("button:has-text('Send reset link')"); settle(page)
    return page.inner_text("body")

def new_ctx(b): return b.new_context(viewport={"width": 1100, "height": 900})

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- 0. a session of member A that exists BEFORE the reset ----------
    X = new_ctx(b); xp = X.new_page(); login(xp, "a@test.pk", "OldPass123")
    check("0. member A can log in with the old password (existing session)", "/dashboard" in xp.url, xp.url)

    # ---------- 1. Forgot-password link ----------
    ctx1 = new_ctx(b); pg = ctx1.new_page(); pg.goto(BASE + "/login"); watch(pg)
    check("1. login page shows a visible 'Forgot password?' link", pg.locator("a:has-text('Forgot password?')").is_visible())
    pg.click("a:has-text('Forgot password?')"); settle(pg)
    check("1. link opens the reset-request page", pg.url.endswith("/forgot-password") and pg.locator("input[name=email]").is_visible(), pg.url)

    # ---------- 2/3. registered vs unregistered email: neutral, identical ----------
    t_reg = forgot(pg, "a@test.pk"); n_reg = len(mails("a@test.pk"))
    t_unk = forgot(pg, "nobody@test.pk"); n_unk = len(mails("nobody@test.pk"))
    check("2. reset request for a REGISTERED email shows the neutral message", NEUTRAL in t_reg)
    check("2. ... and one reset email is created for it", n_reg == 1, n_reg)
    check("3. reset request for an UNREGISTERED email shows the SAME neutral message", NEUTRAL in t_unk)
    pick = lambda t: t[t.index(NEUTRAL): t.index(NEUTRAL) + 190]
    check("3. the two answers are word-for-word identical (no account enumeration)", pick(t_reg) == pick(t_unk))
    check("3. ... and NO email is created for the unregistered address", n_unk == 0, n_unk)
    pg.goto(BASE + "/forgot-password")
    pg.fill("input[name=email]", "not-an-email"); pg.click("button:has-text('Send reset link')")
    check("3. the browser itself refuses a malformed email (client-side check)", pg.evaluate("document.querySelector('input[name=email]').validity.typeMismatch"))
    pg.evaluate("document.querySelector('input[name=email]').type = 'text'")      # simulate an attacker bypassing the browser
    pg.click("button:has-text('Send reset link')"); settle(pg)
    check("3. the SERVER also rejects a malformed email", "Enter a valid email address" in pg.inner_text("body"))

    # ---------- 4. abuse protection ----------
    forgot(pg, "a@test.pk"); forgot(pg, "a@test.pk")           # 2nd and 3rd allowed
    t4 = forgot(pg, "a@test.pk")                                # 4th within the hour -> limited
    check("4. 4th reset request for the same email within an hour is rate limited", "Too many attempts" in t4, t4[-200:])
    check("4. rate limited request sent no extra email (3 emails total)", len(mails("a@test.pk")) == 3, len(mails("a@test.pk")))
    for _ in range(3): forgot(pg, "ghostreset@test.pk")
    check("4. the limit also applies to an UNKNOWN email the same way (it reveals nothing about accounts)",
          "Too many attempts" in forgot(pg, "ghostreset@test.pk"))

    m_a = mails("a@test.pk"); link_ok, link_exp, link_type = m_a[0]["link"], m_a[1], m_a[2]

    # ---------- 5. valid link (opened in ANOTHER browser = cross-device) ----------
    ctx2 = new_ctx(b); rp = ctx2.new_page(); watch(rp); rp.goto(link_ok); settle(rp)
    check("5. valid link opens the 'new password' page", rp.url.endswith("/reset-password") and rp.locator("input[name=password]").is_visible(), rp.url)
    rp.fill("input[name=password]", "NewPass456!"); rp.fill("input[name=confirm]", "Different789!")
    rp.click("button:has-text('Change password')"); settle(rp)
    check("5. mismatching confirmation is rejected", "do not match" in rp.inner_text("body") and rp.url.endswith("/reset-password"))
    rp.fill("input[name=password]", "short"); rp.fill("input[name=confirm]", "short")
    check("5. the browser refuses a too-short password (client-side check)", rp.evaluate("document.querySelector('input[name=password]').validity.tooShort"))
    rp.evaluate("document.querySelectorAll('input').forEach(i => { i.removeAttribute('minlength'); i.removeAttribute('maxlength'); })")  # attacker bypass
    rp.click("button:has-text('Change password')"); settle(rp)
    check("5. the SERVER also rejects a too-short password", "at least 8" in rp.inner_text("body"), rp.inner_text("body")[-250:])
    rp.fill("input[name=password]", "OldPass123"); rp.fill("input[name=confirm]", "OldPass123")
    rp.click("button:has-text('Change password')"); settle(rp)
    check("5. re-using the old password is refused", "not used before" in rp.inner_text("body"), rp.inner_text("body")[-200:])
    rp.fill("input[name=password]", "NewPass456!"); rp.fill("input[name=confirm]", "NewPass456!")
    rp.click("button:has-text('Change password')"); settle(rp, 1200)
    check("5. success: redirected to login with a success message", "/login" in rp.url and "Your password was changed" in rp.inner_text("body"), rp.url)

    # ---------- 6/7/8/9. reused, expired, invalid links ----------
    def open_link(url):
        c = new_ctx(b); pp = c.new_page(); watch(pp); pp.goto(url); settle(pp); t = pp.inner_text("body"); u = pp.url; c.close(); return u, t
    u, t = open_link(link_ok)
    check("6. the SAME link cannot be used twice", "forgot-password" in u and "invalid, has expired or was already used" in t, (u, t[:100]))
    get(f"{MOCK}/__expire", headers={"content-type": "application/json"}, data=json.dumps({"token_hash": link_exp["token_hash"]}).encode(), method="POST")
    u, t = open_link(link_exp["link"])
    check("7. an EXPIRED link is rejected", "forgot-password" in u and "invalid, has expired or was already used" in t, (u, t[:100]))
    u, t = open_link(BASE + "/auth/confirm?token_hash=deadbeefdeadbeef&type=recovery")
    check("8. an INVALID (made-up) token is rejected", "forgot-password" in u and "invalid" in t)
    u, t = open_link(link_type["link"].replace("type=recovery", "type=signup"))
    check("8. a token with the wrong type (signup) is rejected", "forgot-password" in u and "invalid" in t)
    u, t = open_link(BASE + "/auth/confirm?code=not-a-real-code")
    check("8. a made-up PKCE code is rejected", "forgot-password" in u and "invalid" in t)
    u, t = open_link(BASE + "/auth/confirm")
    check("8. /auth/confirm without any token is rejected", "forgot-password" in u)
    u, t = open_link(BASE + "/reset-password")
    check("9. /reset-password cannot be opened directly (no valid link)", "forgot-password" in u and "invalid" in t, u)
    u, _ = open_link(link_type["link"])   # the 3rd valid link still works => 'type' check did not burn it
    check("9. a still-valid link keeps working after the rejected attempts", u.endswith("/reset-password"), u)

    # ---------- 10/11. old vs new password, old sessions ----------
    ctx3 = new_ctx(b); mp = ctx3.new_page(); login(mp, "a@test.pk", "OldPass123")
    check("10. the OLD password no longer works", "Invalid email or password" in mp.inner_text("body"), mp.url)
    login(mp, "a@test.pk", "NewPass456!")
    check("10. the NEW password works (member lands on the dashboard)", "/dashboard" in mp.url, mp.url)
    xp.goto(BASE + "/dashboard"); settle(xp)
    check("11. a session opened BEFORE the reset is signed out everywhere", "/login" in xp.url, xp.url)

    # ---------- 12. admin can reset too, and still lands in /admin ----------
    ctxa = new_ctx(b); ap = ctxa.new_page(); forgot(ap, "admin@test.pk")
    ml = mails("admin@test.pk"); check("12. admin account receives a reset email", len(ml) == 1)
    ap.goto(ml[0]["link"]); settle(ap)
    check("12. admin reaches the new-password page (not bounced to /admin)", ap.url.endswith("/reset-password"), ap.url)
    ap.fill("input[name=password]", "AdminNew789!"); ap.fill("input[name=confirm]", "AdminNew789!")
    ap.click("button:has-text('Change password')"); settle(ap, 1200)
    login(ap, "admin@test.pk", "AdminNew789!")
    check("12. admin logs in with the new password and lands on /admin", "/admin" in ap.url, ap.url)

    # ---------- 13. member features, privacy of other members ----------
    mp.goto(BASE + "/dashboard"); settle(mp); html = mp.content()
    check("13. member dashboard shows the matching profile (B)", "Member B" in html)
    check("13. dashboard HTML/data has no exact income or date of birth of others", "137531" not in html and "1996-07-07" not in html)
    mp.goto(f"{BASE}/profile/{B}"); settle(mp); html = mp.content()
    check("13. B's profile page shows an income BAND", "100,000 to 150,000" in html)
    check("13. B's page and embedded data do not contain the exact income, DOB, CNIC or phone",
          all(s not in html for s in ("137531", "137,531", "1996-07-07", "22222-2222222-2", "03000000002")))
    check("13. B's page shows age only", "Years (Turning" in html)
    mp.goto(f"{BASE}/profile/{C}"); settle(mp)
    check("13. a PENDING member's profile is not viewable by other members", "could not be found" in mp.inner_text("body").lower() or "404" in mp.inner_text("body") or "not found" in mp.inner_text("body").lower())
    mp.goto(BASE + "/my-profile"); settle(mp)
    check("13. member can open and see own profile form incl. own date of birth", mp.locator("input[name=dob]").input_value() == "1994-05-05", mp.locator("input[name=dob]").input_value())
    mp.goto(BASE + "/admin"); settle(mp)
    check("13. a member opening /admin is turned away", "/admin" not in mp.url.replace(BASE, ""), mp.url)
    mp.goto(BASE + "/admin/payments"); settle(mp)
    check("13. a member opening an admin sub-page is turned away", "/admin" not in mp.url.replace(BASE, ""), mp.url)
    anon = new_ctx(b); an = anon.new_page(); an.goto(BASE + "/admin/profiles"); settle(an)
    check("13. a logged-out visitor opening /admin/profiles is sent to login", "/login" in an.url, an.url)

    # ---------- 14. admin pages ----------
    for path, needle in (("/admin", "Welcome"), ("/admin/profiles", "Member A"), (f"/admin/profiles/{A}", "11111-1111111-1"), ("/admin/reports", "Reports"), ("/admin/payments", "Payments")):
        ap.goto(BASE + path); settle(ap)
        check(f"14. admin can open {path}", needle in ap.inner_text("body"), ap.url)
    ap.goto(BASE + "/admin/profiles?q=22222-2222222-2"); settle(ap)
    check("14. admin can search a member by CNIC", "Member B" in ap.inner_text("body"))
    ap.goto(BASE + "/admin/profiles?q=Member%20B"); settle(ap)
    check("14. admin list shows the CNIC masked (full number is not in the page)", "22222-*******-2" in ap.content() and "22222-2222222-2" not in ap.content())
    ap.goto(f"{BASE}/admin/profiles/{A}"); settle(ap)
    check("14. admin sees the exact date of birth on the member page", "1994-05-05" in ap.content())

    # ---------- 15. direct database API, as a normal member (scraping / tampering) ----------
    tok = json.loads(get(f"{MOCK}/__token?id={A}")[1])["token"]
    H = {"apikey": ANON, "Authorization": "Bearer " + tok, "Content-Type": "application/json"}
    s, body = get(f"{MOCK}/rest/v1/profiles?select=*", H); rows = json.loads(body)
    check("15. member listing ALL profiles through the API gets only their own row", s == 200 and len(rows) == 1 and rows[0]["id"] == A, (s, len(rows)))
    check("15. ... and that row has no exact date of birth column", "dob" not in rows[0])
    s, body = get(f"{MOCK}/rest/v1/profiles?id=eq.{B}&select=full_name,monthly_income_pkr", H)
    check("15. member asking for B's income through the API gets nothing", json.loads(body) == [], body[:100])
    s, body = get(f"{MOCK}/rest/v1/profile_private?select=*", H)
    check("15. member reading the CNIC table through the API gets nothing", s in (401, 403) or json.loads(body) == [], (s, body[:100]))
    s, body = get(f"{MOCK}/rest/v1/profile_birth?select=*", H); r = json.loads(body)
    check("15. member can read only their OWN birth date", len(r) == 1 and r[0]["profile_id"] == A, body[:100])
    s, body = get(f"{MOCK}/rest/v1/rpc/match_candidates_for", H, json.dumps({"p_user": B}).encode(), "POST")
    check("15. member cannot call the server-only matching function", s in (401, 403, 404) or "denied" in body.decode(), (s, body[:100]))
    s, body = get(f"{MOCK}/rest/v1/profiles?id=eq.{A}", H, json.dumps({"role": "admin"}).encode(), "PATCH")
    check("15. member cannot make themselves admin", s >= 400 and "protected" in body.decode(), (s, body[:120]))
    s, body = get(f"{MOCK}/rest/v1/profiles?id=eq.{A}", H, json.dumps({"photo_path": f"{B}/photo.jpg"}).encode(), "PATCH")
    check("15. member cannot point their photo at someone else's file", s >= 400 and "Invalid photo path" in body.decode(), (s, body[:120]))
    s, body = get(f"{MOCK}/rest/v1/profiles?id=eq.{A}", H, json.dumps({"valid_until": "2099-01-01T00:00:00Z"}).encode(), "PATCH")
    check("15. member cannot extend their own membership", s >= 400, (s, body[:120]))
    s, body = get(f"{MOCK}/rest/v1/profiles?id=eq.{A}", H, json.dumps({"gender": "female"}).encode(), "PATCH")
    check("15. verified member cannot change their locked gender through the API", s >= 400 and "locked" in body.decode(), (s, body[:120]))
    s, body = get(f"{MOCK}/rest/v1/profile_private?profile_id=eq.{A}", H, json.dumps({"cnic_number": "99999-9999999-9"}).encode(), "PATCH")
    check("15. member cannot change a CNIC number through the API", s >= 400, (s, body[:120]))
    s, body = get(f"{MOCK}/rest/v1/profiles?select=id", {"apikey": ANON, "Authorization": "Bearer " + ANON})
    check("15. logged-out visitor listing profiles gets nothing", json.loads(body) == [], body[:80])

    # ---------- 16. private photos ----------
    get(f"{MOCK}/storage/v1/object/profile-photos/{B}/photo.jpg", {"content-type": "image/jpeg"}, open("/tmp/e2e/img/b_photo.jpg", "rb").read(), "POST")
    r = ctx3.request.get(f"{BASE}/api/photos/{B}"); im = Image.open(io.BytesIO(r.body()))
    check("16. other member sees a BLURRED, small version of a private photo", r.status == 200 and im.width == 320, (r.status, im.size))
    psql(f"update public.profiles set photo_path = '{B}/photo.jpg' where id = '{A}'")
    r = ctx3.request.get(f"{BASE}/api/photos/{A}")
    check("16. a tampered photo_path does NOT reveal B's original (route ignores the stored path)", r.status == 404, r.status)
    psql(f"update public.profiles set photo_path = '{A}/photo.jpg' where id = '{A}'")
    r = ctx3.request.get(f"{BASE}/api/photos/{B}%27%20or%201=1")
    check("16. a malformed id is rejected", r.status == 404, r.status)
    r = anon.request.get(f"{BASE}/api/photos/{B}")
    check("16. logged-out visitor cannot fetch photos", r.status == 401, r.status)

    # ---------- 17. registration + uploads ----------
    def register(page, email, cnic, files, name="Test User"):
        page.goto(BASE + "/register"); watch(page)
        page.fill("input[name=email]", email); page.fill("input[name=password]", "RegPass12345")
        page.fill("input[name=phone]", "03111111111"); page.fill("input[name=cnic_number]", cnic)
        page.fill("input[name=full_name]", name); page.select_option("select[name=gender]", "male")
        page.select_option("select[name=marital_status]", "single"); page.fill("input[name=dob]", "1995-05-05")
        page.select_option("select[name=city]", "Bahawalpur")
        for field, f in files.items(): page.set_input_files(f"input[name={field}]", "/tmp/e2e/img/" + f)
        page.check("input[name=agree]"); page.click("button:has-text('Create my profile')"); settle(page, 1800)
        return page.inner_text("body")
    good = {"cnic_front": "front.png", "cnic_back": "back.jpg", "cnic_selfie": "selfie_gps.jpg", "photo": "photo.webp"}
    ctxr = new_ctx(b); rg = ctxr.new_page()
    register(rg, "new@test.pk", "55555-5555555-5", good)
    check("17. legitimate registration works and signs the new member in", "/dashboard" in rg.url, rg.url)
    keys = json.loads(get(f"{MOCK}/__files")[1])
    ck = [k for k in keys if k.startswith("cnic-documents/") and k.endswith("/selfie.jpg") and A not in k]
    stored = get(f"{MOCK}/__file?key={ck[0]}")[1] if ck else b""
    src = open("/tmp/e2e/img/selfie_gps.jpg", "rb").read()
    check("17. the CNIC selfie is stored as a JPEG named by the server", stored[:3] == b"\xff\xd8\xff" and ck, ck)
    check("17. the uploaded selfie had GPS/EXIF data, the stored copy has none", b"Exif" in src and b"Exif" not in stored[:4096] and b"GPS" not in stored)
    check("17. all four files were stored under server-generated names",
          sorted(k.split("/", 2)[2].split("/")[-1] for k in keys if k.startswith(("cnic-documents/", "profile-photos/")) and A not in k and B not in k) == ["cnic-back.jpg", "cnic-front.jpg", "photo.jpg", "selfie.jpg"], keys)
    ctxd = new_ctx(b); d1 = ctxd.new_page()
    t_cnic = register(d1, "dup1@test.pk", "55555-5555555-5", good)
    t_mail = register(ctxd.new_page(), "new@test.pk", "66666-6666666-6", good)
    check("17. duplicate CNIC and duplicate email give the SAME neutral message", t_cnic.count("We could not complete your registration") == 1 and t_mail.count("We could not complete your registration") == 1)
    d = lambda t: t[t.index("We could not complete"): t.index("We could not complete") + 150] if "We could not complete" in t else ""
    check("17. ... word for word identical", d(t_cnic) == d(t_mail) != "")
    files_before = len(json.loads(get(f"{MOCK}/__files")[1]))
    t_fake = register(ctxd.new_page(), "fake@test.pk", "77777-7777777-7", {**good, "photo": "fake.jpg"})
    check("17. an HTML file renamed .jpg is rejected as a photo", "must be a JPG, PNG or WebP" in t_fake, t_fake[-200:])
    check("17. the rejected registration left no account and no files behind",
          len(json.loads(get(f"{MOCK}/__files")[1])) == files_before and "fake@test.pk" not in json.loads(get(f"{MOCK}/__users")[1]))
    register(ctxd.new_page(), "fake5@test.pk", "88888-8888888-8", {**good, "photo": "fake.jpg"})
    t_lim = register(ctxd.new_page(), "fake6@test.pk", "99999-9999999-9", {**good, "photo": "fake.jpg"})
    check("17. too many registrations from one address are rate limited", "Too many attempts" in t_lim, t_lim[-200:])

    # ---------- 18. security headers, CSP ----------
    r = anon.request.get(BASE + "/")
    h = {k.lower(): v for k, v in r.headers.items()}
    check("18. Content-Security-Policy is sent", "default-src 'self'" in h.get("content-security-policy", ""))
    check("18. framing is blocked (frame-ancestors + X-Frame-Options)", "frame-ancestors 'none'" in h.get("content-security-policy", "") and h.get("x-frame-options") == "DENY")
    check("18. MIME sniffing is blocked", h.get("x-content-type-options") == "nosniff")
    check("18. referrer policy is set", h.get("referrer-policy") == "strict-origin-when-cross-origin")
    check("18. HSTS is sent", "max-age" in h.get("strict-transport-security", ""))
    r = anon.request.get(BASE + "/forgot-password"); h2 = {k.lower(): v for k, v in r.headers.items()}
    check("18. reset pages are not cacheable", h2.get("cache-control") == "no-store", h2.get("cache-control"))
    watch(an)
    for path in ("/", "/pricing", "/forgot-password", "/register", "/login"):
        an.goto(BASE + path); settle(an)
    check("18. no Content-Security-Policy violation on the public pages", not csp_msgs, csp_msgs[:3])
    ap.goto(f"{BASE}/admin/profiles/{A}"); settle(ap); mp.goto(BASE + "/dashboard"); settle(mp)
    check("18. no Content-Security-Policy violation on member and admin pages", not csp_msgs, csp_msgs[:3])

    # ---------- 19. brute force on login (last: it uses up the login budget) ----------
    lp = new_ctx(b).new_page(); texts = []
    for i in range(9): login(lp, "ghost@test.pk", "wrong-%d" % i); texts.append(lp.inner_text("body"))
    check("19. wrong passwords are answered generically", all("Invalid email or password" in t for t in texts[:8]))
    check("19. the 9th attempt in 15 minutes is rate limited", "Too many attempts" in texts[8], texts[8][-150:])
    b.close()

print("---- %d passed, %d failed" % (sum(1 for _, ok in results if ok), sum(1 for _, ok in results if not ok)))
