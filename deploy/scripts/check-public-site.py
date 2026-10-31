"""Read-only semantic checks: an HTTP 200 streamed error page is not healthy."""

import argparse
import json
import re
from urllib.parse import urlencode
from urllib.request import urlopen


def check(base_url: str) -> None:
    base = base_url.rstrip("/")
    for route, heading in [("/notes", "学习笔记"), ("/contact", "联系")]:
        with urlopen(f"{base}{route}", timeout=20) as response:
            html = response.read().decode("utf-8")
            if response.status != 200 or not re.search(
                rf"<h1\b[^>]*>\s*{heading}\s*</h1>", html
            ):
                raise RuntimeError(f"{route}: expected page content missing")
        print(f"PASS {route}: heading present")
    for keyword in ["笔记", "TCP"]:
        query = urlencode({"q": keyword, "page_size": 2})
        with urlopen(f"{base}/api/v1/posts?{query}", timeout=20) as response:
            payload = json.load(response)
        if (
            payload.get("success") is not True
            or not isinstance(payload.get("data"), list)
            or not isinstance(payload.get("meta", {}).get("total"), int)
        ):
            raise RuntimeError("Post keyword query returned an invalid envelope")
        print(f"PASS post query: {keyword}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="https://devlelin.xyz")
    check(parser.parse_args().base_url)
