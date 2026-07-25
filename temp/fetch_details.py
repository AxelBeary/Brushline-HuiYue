import urllib.request, re, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    resp = urllib.request.urlopen(req, context=ctx, timeout=timeout)
    return resp.read().decode('utf-8', errors='ignore')

def extract_info(html):
    html_clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    html_clean = re.sub(r'<style[^>]*>.*?</style>', '', html_clean, flags=re.DOTALL)
    title_m = re.search(r'<title>(.*?)</title>', html_clean, re.DOTALL)
    title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else ''
    body = re.sub(r'<[^>]+>', ' ', html_clean)
    body = re.sub(r'\s+', ' ', body).strip()
    return title, body[:5000]

# 1. RingoTrack GitHub README
print("="*60)
print("1. RingoTrack (GitHub)")
print("="*60)
try:
    html = fetch("https://raw.githubusercontent.com/ringotypowriter/ringotrack/main/README.md")
    print(html[:4000])
except Exception as e:
    print(f"ERROR: {e}")
    try:
        html = fetch("https://raw.githubusercontent.com/ringotypowriter/ringotrack/master/README.md")
        print(html[:4000])
    except Exception as e2:
        print(f"ERROR2: {e2}")

# 2. CSP-DiscordRichPresence GitHub README
print("\n" + "="*60)
print("2. CSP-DiscordRichPresence (GitHub)")
print("="*60)
try:
    html = fetch("https://raw.githubusercontent.com/Plushiee/CSP-DiscordRichPresence/main/README.md")
    print(html[:4000])
except Exception as e:
    print(f"ERROR: {e}")
    try:
        html = fetch("https://raw.githubusercontent.com/Plushiee/CSP-DiscordRichPresence/master/README.md")
        print(html[:4000])
    except Exception as e2:
        print(f"ERROR2: {e2}")

# 3. CSP official support - work time FAQ
print("\n" + "="*60)
print("3. CSP Official - Work Time FAQ")
print("="*60)
try:
    html = fetch("https://support.clip-studio.com/en-us/faq/articles/20230052")
    title, body = extract_info(html)
    print(f"Title: {title}")
    print(body[:3000])
except Exception as e:
    print(f"ERROR: {e}")

# 4. PinTime
print("\n" + "="*60)
print("4. PinTime (pintime.net)")
print("="*60)
try:
    html = fetch("https://pintime.net/")
    title, body = extract_info(html)
    print(f"Title: {title}")
    print(body[:3000])
except Exception as e:
    print(f"ERROR: {e}")

# 5. Tai - GitHub
print("\n" + "="*60)
print("5. Tai (GitHub)")
print("="*60)
try:
    html = fetch("https://raw.githubusercontent.com/Planshit/Tai/main/README.md")
    print(html[:3000])
except Exception as e:
    print(f"ERROR: {e}")
    try:
        html = fetch("https://raw.githubusercontent.com/Planshit/Tai/master/README.md")
        print(html[:3000])
    except Exception as e2:
        print(f"ERROR2: {e2}")

# 6. KOYAMA drawing timer
print("\n" + "="*60)
print("6. KOYAMA drawing timer (yeyulingfeng)")
print("="*60)
try:
    html = fetch("https://www.yeyulingfeng.com/89732.html")
    title, body = extract_info(html)
    print(f"Title: {title}")
    print(body[:3000])
except Exception as e:
    print(f"ERROR: {e}")

# 7. GitHub search for more drawing time trackers
print("\n" + "="*60)
print("7. GitHub API search")
print("="*60)
try:
    api_headers = {**HEADERS, 'Accept': 'application/vnd.github+json'}
    req = urllib.request.Request(
        "https://api.github.com/search/repositories?q=drawing+time+tracker+clip+studio&sort=stars&per_page=10",
        headers=api_headers
    )
    resp = urllib.request.urlopen(req, context=ctx, timeout=15)
    data = json.loads(resp.read().decode('utf-8'))
    for item in data.get('items', []):
        print(f"  {item['full_name']} ⭐{item['stargazers_count']} - {item['description'] or 'N/A'}")
        print(f"    {item['html_url']}")
except Exception as e:
    print(f"ERROR: {e}")

# 8. More specific GitHub search
print("\n" + "="*60)
print("8. GitHub search: painting time tracker")
print("="*60)
try:
    req = urllib.request.Request(
        "https://api.github.com/search/repositories?q=painting+time+tracker+windows&sort=stars&per_page=10",
        headers=api_headers
    )
    resp = urllib.request.urlopen(req, context=ctx, timeout=15)
    data = json.loads(resp.read().decode('utf-8'))
    for item in data.get('items', []):
        print(f"  {item['full_name']} ⭐{item['stargazers_count']} - {item['description'] or 'N/A'}")
        print(f"    {item['html_url']}")
except Exception as e:
    print(f"ERROR: {e}")

# 9. GitHub search: 绘画时间
print("\n" + "="*60)
print("9. GitHub search: 绘画时间")
print("="*60)
try:
    req = urllib.request.Request(
        "https://api.github.com/search/repositories?q=%E7%BB%98%E7%94%BB%E6%97%B6%E9%97%B4&sort=stars&per_page=10",
        headers=api_headers
    )
    resp = urllib.request.urlopen(req, context=ctx, timeout=15)
    data = json.loads(resp.read().decode('utf-8'))
    for item in data.get('items', []):
        print(f"  {item['full_name']} ⭐{item['stargazers_count']} - {item['description'] or 'N/A'}")
        print(f"    {item['html_url']}")
except Exception as e:
    print(f"ERROR: {e}")
