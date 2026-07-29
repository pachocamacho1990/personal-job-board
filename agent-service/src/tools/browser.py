import logging
import re
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
import markdownify
from playwright.async_api import async_playwright, Browser, Playwright, Page

logger = logging.getLogger(__name__)

# Tags stripped before conversion: they carry no reading value and burn LLM context.
NOISE_TAGS = ["script", "style", "noscript", "nav", "footer", "header", "form", "svg", "iframe"]

# Cap the length to avoid overwhelming the LLM context window.
MAX_CONTENT_CHARS = 15000
TRUNCATION_NOTICE = "\n\n...[Content truncated due to length]..."


def html_to_markdown(html: str, max_chars: int = MAX_CONTENT_CHARS) -> str:
    """
    Cleans a raw HTML document and converts it to compact markdown.

    Pure function: no browser, no I/O. Strips noise tags, converts to ATX
    markdown, compacts runs of blank lines and truncates to `max_chars`.
    """
    soup = BeautifulSoup(html, "html.parser")

    for element in soup(NOISE_TAGS):
        element.decompose()

    clean_html = str(soup.body if soup.body else soup)
    md_text = markdownify.markdownify(clean_html, heading_style="ATX").strip()

    # Compact multiple newlines to save tokens
    md_text = re.sub(r'\n{3,}', '\n\n', md_text)

    if len(md_text) > max_chars:
        md_text = md_text[:max_chars] + TRUNCATION_NOTICE

    return md_text


class BrowserManager:
    """
    Singleton manager for the Playwright browser instance.
    Keeps a single headless Chromium browser running in the background.
    """
    _instance = None
    
    def __init__(self):
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def _ensure_started(self):
        if self.browser is None:
            logger.info("Starting Playwright browser...")
            self.playwright = await async_playwright().start()
            # We use chromium by default. We can disable security/sandboxing slightly if needed in docker.
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            logger.info("Playwright browser started successfully.")

    async def shutdown(self):
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None

    async def navigate_and_read_markdown(self, url: str) -> Dict[str, Any]:
        """
        Navigates to the given URL, extracts the DOM, cleans it, and converts to markdown.
        """
        await self._ensure_started()
        
        # Open a new isolated context for this request
        context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            logger.info(f"Browsing URL: {url}")
            # Wait until network is mostly idle to ensure SPAs load
            response = await page.goto(url, wait_until="networkidle", timeout=15000)
            
            if response is None:
                return {"success": False, "error": "Failed to get a response from the URL."}
                
            if not response.ok:
                return {"success": False, "error": f"HTTP Error {response.status} when accessing {url}."}

            # Extract the raw HTML of the body
            html_content = await page.content()

            md_text = html_to_markdown(html_content)

            return {
                "success": True, 
                "url": url,
                "title": await page.title(),
                "content": md_text
            }
            
        except Exception as e:
            logger.error(f"Error browsing {url}: {e}")
            return {"success": False, "error": f"Error loading page: {str(e)}"}
            
        finally:
            await context.close()

# Global singleton instance
browser_manager = BrowserManager()
