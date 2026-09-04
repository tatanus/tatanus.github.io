#!/usr/bin/env python3
"""Regenerate feed.xml and sitemap.xml from blog/posts.json.

Run from the repo root after adding a post to blog/posts.json:

    python3 tools/generate_feed.py

Output is deterministic: lastBuildDate follows the newest post date rather
than the current time, so re-running without content changes is a no-op.
"""
import json
import pathlib
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape

SITE = "https://hillbillystorytime.com"
TITLE = "HillbillyStorytime"
DESCRIPTION = ("Penetration testing, security automation, and Appalachian "
               "storytelling from Adam Compton.")

# Static pages worth listing in the sitemap, in nav order.
PAGES = ["index.html", "development.html", "presentations.html",
         "videos.html", "sponsor.html", "about.html", "info.html"]

ROOT = pathlib.Path(__file__).resolve().parent.parent


def post_url(post):
    return f"{SITE}/post.html?file={post['file']}"


def parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def main():
    posts_path = ROOT / "blog" / "posts.json"
    posts = json.loads(posts_path.read_text())
    posts = [p for p in posts if p.get("file")]
    posts.sort(key=lambda p: p.get("date") or "", reverse=True)

    dates = [d for d in (parse_date(p.get("date")) for p in posts) if d]
    built = max(dates) if dates else datetime(1970, 1, 1, tzinfo=timezone.utc)

    # ---- feed.xml (RSS 2.0) ----
    items = []
    for p in posts:
        pub = parse_date(p.get("date"))
        items.append(
            "    <item>\n"
            f"      <title>{escape(p.get('title', p['file']))}</title>\n"
            f"      <link>{escape(post_url(p))}</link>\n"
            f"      <guid isPermaLink=\"true\">{escape(post_url(p))}</guid>\n"
            + (f"      <pubDate>{format_datetime(pub)}</pubDate>\n" if pub else "")
            + f"      <description>{escape(p.get('excerpt', ''))}</description>\n"
            "    </item>"
        )

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        '  <channel>\n'
        f'    <title>{escape(TITLE)}</title>\n'
        f'    <link>{SITE}/</link>\n'
        f'    <description>{escape(DESCRIPTION)}</description>\n'
        '    <language>en-us</language>\n'
        f'    <lastBuildDate>{format_datetime(built)}</lastBuildDate>\n'
        f'    <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n'
        + "\n".join(items) + ("\n" if items else "") +
        '  </channel>\n'
        '</rss>\n'
    )
    (ROOT / "feed.xml").write_text(feed)

    # ---- sitemap.xml ----
    # lastmod is emitted only where a real date exists: each post carries its
    # own, and the blog index tracks the newest post. Static pages have no
    # trustworthy date, and lastmod is optional per the sitemap spec.
    newest = posts[0].get("date") if posts else None
    entries = []
    for page in PAGES:
        stamp = newest if page == "index.html" else None
        entries.append((f"{SITE}/{page}", stamp))
    entries += [(post_url(p), p.get("date")) for p in posts]

    urls = [u for u, _ in entries]
    body = "\n".join(
        f"  <url><loc>{escape(u)}</loc>"
        + (f"<lastmod>{escape(d)}</lastmod>" if d else "")
        + "</url>"
        for u, d in entries
    )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        '</urlset>\n'
    )
    (ROOT / "sitemap.xml").write_text(sitemap)

    print(f"feed.xml    : {len(posts)} post(s)")
    print(f"sitemap.xml : {len(urls)} url(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
