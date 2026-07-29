import asyncio

from src.tools.browser import (
    BrowserManager,
    MAX_CONTENT_CHARS,
    TRUNCATION_NOTICE,
    html_to_markdown,
)


# ── Test doubles for Playwright ──────────────────────────
# navigate_and_read_markdown only touches a narrow slice of the Playwright API,
# so we fake it instead of launching a real Chromium.

class FakeResponse:
    def __init__(self, ok=True, status=200):
        self.ok = ok
        self.status = status


class FakePage:
    def __init__(self, response=FakeResponse(), html="<html><body><p>hi</p></body></html>",
                 title="Fake Title", goto_error=None):
        self._response = response
        self._html = html
        self._title = title
        self._goto_error = goto_error
        self.visited_url = None

    async def goto(self, url, wait_until=None, timeout=None):
        self.visited_url = url
        if self._goto_error:
            raise self._goto_error
        return self._response

    async def content(self):
        return self._html

    async def title(self):
        return self._title


class FakeContext:
    def __init__(self, page):
        self._page = page
        self.closed = False

    async def new_page(self):
        return self._page

    async def close(self):
        self.closed = True


class FakeBrowser:
    def __init__(self, context):
        self._context = context
        self.user_agent = None

    async def new_context(self, user_agent=None):
        self.user_agent = user_agent
        return self._context


def make_manager(page):
    """A BrowserManager wired to fakes, so _ensure_started never launches Chromium."""
    context = FakeContext(page)
    manager = BrowserManager()
    manager.browser = FakeBrowser(context)
    return manager, context


# ── html_to_markdown: the pure parsing layer ─────────────

def test_strips_noise_tags():
    html = """
    <html><body>
        <script>trackUser()</script>
        <style>.a { color: red }</style>
        <noscript>enable js</noscript>
        <nav>Home About Contact</nav>
        <header>Site header</header>
        <form><input name="q"></form>
        <svg><title>icon</title></svg>
        <iframe src="ads.html"></iframe>
        <p>Real job description here.</p>
        <footer>Copyright 2026</footer>
    </body></html>
    """
    md = html_to_markdown(html)

    assert "Real job description here." in md
    for noise in ["trackUser", "color: red", "enable js", "Home About Contact",
                  "Site header", "icon", "ads.html", "Copyright 2026"]:
        assert noise not in md


def test_uses_atx_headings():
    md = html_to_markdown("<html><body><h1>Senior Engineer</h1><h2>Remote</h2></body></html>")

    assert "# Senior Engineer" in md
    assert "## Remote" in md
    # ATX style, not the underlined setext style
    assert "===" not in md


def test_keeps_links_and_lists():
    html = """
    <html><body>
        <ul><li>Python</li><li>Postgres</li></ul>
        <a href="https://example.com/apply">Apply now</a>
    </body></html>
    """
    md = html_to_markdown(html)

    assert "Python" in md
    assert "Postgres" in md
    assert "[Apply now](https://example.com/apply)" in md


def test_compacts_blank_line_runs():
    html = "<html><body>" + "<p>text</p>" + "<br>" * 12 + "<p>more text</p></body></html>"
    md = html_to_markdown(html)

    assert "\n\n\n" not in md


def test_strips_surrounding_whitespace():
    md = html_to_markdown("<html><body>\n\n   <p>content</p>   \n\n</body></html>")

    assert md == md.strip()


def test_truncates_past_the_cap():
    html = "<html><body><p>" + ("word " * 5000) + "</p></body></html>"
    md = html_to_markdown(html, max_chars=100)

    assert md.endswith(TRUNCATION_NOTICE)
    assert len(md) == 100 + len(TRUNCATION_NOTICE)


def test_no_truncation_notice_when_under_the_cap():
    md = html_to_markdown("<html><body><p>short</p></body></html>")

    assert TRUNCATION_NOTICE not in md
    assert md == "short"


def test_default_cap_is_15k():
    html = "<html><body><p>" + ("x" * 40000) + "</p></body></html>"
    md = html_to_markdown(html)

    assert len(md) == MAX_CONTENT_CHARS + len(TRUNCATION_NOTICE)


def test_handles_fragment_without_body_tag():
    md = html_to_markdown("<div><h1>Fragment</h1><p>No body wrapper.</p></div>")

    assert "# Fragment" in md
    assert "No body wrapper." in md


def test_handles_empty_html():
    assert html_to_markdown("") == ""


def test_handles_malformed_html():
    md = html_to_markdown("<html><body><p>unclosed <b>bold</body>")

    assert "unclosed" in md


# ── navigate_and_read_markdown: orchestration + errors ───

def test_navigate_success_returns_markdown_payload():
    page = FakePage(
        html="<html><body><h1>Job</h1><script>x()</script><p>Details</p></body></html>",
        title="Job at Acme",
    )
    manager, context = make_manager(page)

    result = asyncio.run(manager.navigate_and_read_markdown("https://example.com/job"))

    assert result["success"] is True
    assert result["url"] == "https://example.com/job"
    assert result["title"] == "Job at Acme"
    assert "# Job" in result["content"]
    assert "Details" in result["content"]
    assert "x()" not in result["content"]
    assert page.visited_url == "https://example.com/job"
    assert context.closed is True


def test_navigate_errors_when_response_is_none():
    manager, context = make_manager(FakePage(response=None))

    result = asyncio.run(manager.navigate_and_read_markdown("https://example.com"))

    assert result["success"] is False
    assert "error" in result
    assert context.closed is True


def test_navigate_errors_on_http_failure():
    manager, context = make_manager(FakePage(response=FakeResponse(ok=False, status=404)))

    result = asyncio.run(manager.navigate_and_read_markdown("https://example.com/gone"))

    assert result["success"] is False
    assert "404" in result["error"]
    assert context.closed is True


def test_navigate_closes_context_when_goto_raises():
    manager, context = make_manager(FakePage(goto_error=TimeoutError("navigation timeout")))

    result = asyncio.run(manager.navigate_and_read_markdown("https://slow.example.com"))

    assert result["success"] is False
    assert "navigation timeout" in result["error"]
    # The leak this guards against: a context left open on every failed navigation.
    assert context.closed is True


def test_navigate_sends_a_desktop_user_agent():
    manager, _ = make_manager(FakePage())

    asyncio.run(manager.navigate_and_read_markdown("https://example.com"))

    assert "Mozilla/5.0" in manager.browser.user_agent


# ── shutdown wiring ──────────────────────────────────────

def test_shutdown_is_safe_when_never_started():
    # The FastAPI lifespan calls this unconditionally, including on runs where
    # no browsing ever happened.
    manager = BrowserManager()

    asyncio.run(manager.shutdown())

    assert manager.browser is None
    assert manager.playwright is None


def test_shutdown_closes_and_clears_the_browser():
    class ClosableBrowser:
        def __init__(self):
            self.closed = False

        async def close(self):
            self.closed = True

    class StoppablePlaywright:
        def __init__(self):
            self.stopped = False

        async def stop(self):
            self.stopped = True

    manager = BrowserManager()
    browser, playwright = ClosableBrowser(), StoppablePlaywright()
    manager.browser = browser
    manager.playwright = playwright

    asyncio.run(manager.shutdown())

    assert browser.closed is True
    assert playwright.stopped is True
    assert manager.browser is None
    assert manager.playwright is None
