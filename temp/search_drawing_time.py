import urllib.request, urllib.parse, re, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers=HEADERS)
    resp = urllib.request.urlopen(req, context=ctx, timeout=timeout)
    return resp.read().decode('utf-8', errors='ignore')

def extract_info(html):
    html_clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    html_clean = re.sub(r'<style[^>]*>.*?</style>', '', html_clean, flags=re.DOTALL)
    title_m = re.search(r'<title>(.*?)</title>', html_clean, re.DOTALL)
    title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else ''
    desc_m = re.search(r'<meta[^>]*(?:name="description"|property="og:description")[^>]*content="([^"]*)"', html)
    desc = desc_m.group(1).strip() if desc_m else ''
    body = re.sub(r'<[^>]+>', ' ', html_clean)
    body = re.sub(r'\s+', ' ', body).strip()
    return title, desc, body[:4000]

# --- Search 1: Bing ---
queries = [
    "Clip Studio Paint 绘画时间统计 实际动笔时间 工具",
    "CSP drawing time tracker actual drawing time Windows",
    "优动漫 画画时间 统计 软件",
    "drawing time tracker only active pen strokes Windows",
    "Clip Studio Paint time tracking plugin",
]

for q in queries:
    print(f"\n{'='*60}")
    print(f"QUERY: {q}")
    print('='*60)
    try:
        encoded = urllib.parse.quote_plus(q)
        url = f"https://www.bing.com/search?q={encoded}&count=10"
        html = fetch(url)
        # Try to extract Bing results
        results = re.findall(r'<li class="b_algo".*?<h2><a href="(https?://[^"]+)"[^>]*>(.*?)</a></h2>.*?<p[^>]*>(.*?)</p>', html, re.DOTALL)
        if not results:
            # Alternative pattern
            results = re.findall(r'<a href="(https?://[^"]+)"[^>]*>(.*?)</a>', html)
            results = [(u, t, '') for u, t in results if 'bing.com' not in u and 'microsoft.com' not in u][:8]
        for i, (url_r, title_r, snippet_r) in enumerate(results[:8]):
            title_clean = re.sub(r'<[^>]+>', '', title_r).strip()
            snippet_clean = re.sub(r'<[^>]+>', '', snippet_r).strip()
            print(f"\n[{i+1}] {title_clean}")
            print(f"    URL: {url_r}")
            if snippet_clean:
                print(f"    {snippet_clean[:200]}")
    except Exception as e:
        print(f"  ERROR: {e}")

# --- Search 2: DuckDuckGo HTML ---
print(f"\n{'='*60}")
print("DuckDuckGo searches")
print('='*60)
ddg_queries = [
    "CSP clip studio paint drawing time tracker active time",
    "绘画时间统计 实际画画时间 小工具 Windows",
]
for q in ddg_queries:
    print(f"\n--- {q} ---")
    try:
        encoded = urllib.parse.quote_plus(q)
        url = f"https://html.duckduckgo.com/html/?q={encoded}"
        html = fetch(url)
        results = re.findall(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
        snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</(?:td|span|div)', html, re.DOTALL)
        for i, (url_r, title_r) in enumerate(results[:8]):
            title_clean = re.sub(r'<[^>]+>', '', title_r).strip()
            snip = re.sub(r'<[^>]+>', '', snippets[i]).strip() if i < len(snippets) else ''
            print(f"  [{i+1}] {title_clean}")
            print(f"      {url_r}")
            if snip:
                print(f"      {snip[:200]}")
        if not results:
            print("  (0 results)")
    except Exception as e:
        print(f"  ERROR: {e}")
