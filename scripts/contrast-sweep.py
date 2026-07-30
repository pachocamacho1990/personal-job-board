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
  const effectiveBg = el => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c) return c;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || [255,255,255];
  };

  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
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
