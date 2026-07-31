"""Visual QA across all six pages in both themes, done by measurement.

Run it inside the agent container, which is where Playwright lives:

    docker cp scripts/contrast-sweep.py jobboard-agent:/tmp/sweep.py
    docker exec jobboard-agent python /tmp/sweep.py

The container is recreated periodically and loses /tmp, so re-copy before use.
Requires `npm run build` first — it reads what nginx serves, not the source.

It sits at 0 and must stay there. Softening a fill or adding a tint is exactly
the kind of change that breaks it without being visible in a screenshot.

Eyeballing twelve screenshots finds the loud failures. What it misses is text
that is merely hard to read — which is exactly what a theme migration produces
when one token was missed. So this walks every rendered text node, resolves the
colour it actually paints against (climbing ancestors past transparent
backgrounds, as the browser does), and reports anything under AA.
"""
import asyncio
import time
from playwright.async_api import async_playwright

BASE = "http://nginx/jobboard"
EMAIL = f"test-qa-{int(time.time())}@example.com"
PAGES = ["index", "jobs", "business", "profile", "docs"]

SCAN = """
() => {
  const lum = ([r, g, b]) => {
    const f = c => { c /= 255; return c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055) ** 2.4; };
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const parse = s => {
    const m = s && s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    if (p.length > 3 && p[3] === 0) return null;   // transparent
    return [p[0], p[1], p[2]];
  };
  // A gradient paints over the background-color, so reading backgroundColor
  // alone misses it entirely — which is exactly the hole the Carbon for AI
  // auras would have fallen through. There is no way to ask the browser what a
  // gradient resolves to at a given pixel, so take the worst case: composite
  // the most opaque colour stop in the gradient over whatever is underneath.
  // Conservative by construction, which is the right direction for a gate.
  const gradientStops = s => {
    if (!s || s === 'none' || !s.includes('gradient')) return [];
    const out = [];
    for (const m of s.matchAll(/rgba?\(([^)]+)\)/g)) {
      const p = m[1].split(',').map(Number);
      out.push({ rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 });
    }
    return out;
  };
  const over = (fg, a, bg) => bg.map((b, i) => Math.round(fg[i] * a + b * (1 - a)));

  const effectiveBg = el => {
    // Collect gradients on the way up; the nearest one paints last, so apply
    // them from the outside in once a solid backstop is found.
    const layers = [];
    let solid = null;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const stops = gradientStops(cs.backgroundImage);
      if (stops.length) {
        const worst = stops.reduce((a, b) => (b.a > a.a ? b : a));
        if (worst.a > 0) layers.unshift(worst);
      }
      const c = parse(cs.backgroundColor);
      if (c) { solid = c; break; }
    }
    solid = solid || parse(getComputedStyle(document.body).backgroundColor) || [255,255,255];
    for (const l of layers) solid = over(l.rgb, l.a, solid);
    return solid;
  };

  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    // Hidden from assistive tech means it is a picture, not text. WCAG asks 3:1
    // of a graphical object, and this scan is a text-contrast scan. Anything
    // using this to dodge the gate must supply a spoken equivalent instead.
    if (el.closest('[aria-hidden="true"]')) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    // Only elements that paint text themselves.
    const text = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim()).join(' ');
    if (!text) continue;

    const fg = parse(cs.color);
    if (!fg) continue;
    const r = ratio(fg, effectiveBg(el));
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const need = large ? 3.0 : 4.5;
    if (r < need) {
      out.push({ text: text.slice(0, 42), tag: el.tagName.toLowerCase(),
                 cls: (el.className && el.className.toString().slice(0, 34)) || '',
                 ratio: +r.toFixed(2), need });
    }
  }
  return out;
}
"""


# A fresh account has an empty board, and an empty board has no cards, no
# timestamps, no ratings and no status tags. This swept clean for six milestones
# while never once measuring a job card — which is how a timestamp at 2.15:1 and
# a rating glyph at 3.33:1 survived. Seed first, then scan.
JOBS = [
    ("Senior Platform Engineer", "Iberdrola Innovación y Tecnología", "interested", "agent", True),
    ("Staff Backend Engineer",   "Cabify",                            "applied",    "agent", False),
    ("Head of Data",             "Glovo",                             "interview",  "human", False),
    ("Principal Architect",      "Telefónica Tech",                   "pending",    "agent", True),
    ("Engineering Manager",      "Wallapop",                          "offer",      "human", False),
    ("Tech Lead",                "Idealista",                         "rejected",   "human", False),
    ("Backend Developer",        "Jobandtalent",                      "forgotten",  "human", False),
]

ENTITIES = [
    ("Kfund", "vc", "researching"), ("Seedcamp", "vc", "contacted"),
    ("Lanzadera", "accelerator", "meeting"), ("Angel Investor", "investor", "negotiation"),
    ("Wayra", "accelerator", "signed"),
]


async def seed(page):
    """Fill both boards so every card state actually renders during the scan."""
    await page.evaluate("""async ([jobs, entities]) => {
      const tok = localStorage.getItem('authToken');
      const board = localStorage.getItem('activeBoardId');
      const post = (url, body) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify(body),
      });
      for (const [position, company, status, origin, unseen] of jobs) {
        await post('/jobboard/api/jobs', {
          type: 'job', position, company, status, origin, is_unseen: unseen,
          rating: 4, location: 'Madrid · Híbrido', salary: '65.000 € – 82.000 €',
          board_id: board ? Number(board) : undefined,
        });
      }
      for (const [name, type, status] of entities) {
        await post('/jobboard/api/business', {
          name, type, status, contact_person: 'Ana García',
          email: 'ana@example.com', location: 'Madrid',
        });
      }
    }""", [JOBS, ENTITIES])


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 1500, "height": 950})
        page = await ctx.new_page()

        await page.goto(f"{BASE}/login.html", wait_until="networkidle", timeout=25000)
        await page.click("#toggleMode")
        await page.fill("#email", EMAIL)
        await page.fill("#password", "password123")
        await page.click("#submitBtn")
        await page.wait_for_url("**/index.html", timeout=25000)
        await seed(page)

        total = 0
        for theme in ("g10", "g100"):
            print(f"\n{'='*66}\n{theme}\n{'='*66}")
            for name in PAGES + ["login"]:
                if name == "login":
                    await ctx.clear_cookies()
                await page.goto(f"{BASE}/{name}.html", wait_until="networkidle", timeout=25000)
                await page.evaluate(
                    "t => document.documentElement.setAttribute('data-carbon-theme', t)", theme)
                await page.wait_for_timeout(900)
                issues = await page.evaluate(SCAN)
                total += len(issues)
                if not issues:
                    print(f"  {name:<10} clean")
                else:
                    print(f"  {name:<10} {len(issues)} below AA")
                    seen = set()
                    for i in issues:
                        key = (i['tag'], i['cls'], i['ratio'])
                        if key in seen:
                            continue
                        seen.add(key)
                        print(f"       {i['ratio']:>5} (needs {i['need']})  "
                              f"<{i['tag']} class=\"{i['cls']}\">  {i['text']!r}")

        await b.close()
        print(f"\n{total} text elements below AA across 12 page/theme combinations")


asyncio.run(main())
