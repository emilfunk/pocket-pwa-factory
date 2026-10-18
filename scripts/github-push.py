#!/usr/bin/env python3
import json
import subprocess
import sys
import time
import urllib.parse
import urllib.request

CLIENT_ID = "178c6fc778ccc68e1d6a"  # GitHub CLI official OAuth Client ID
SCOPES = "repo,read:org,workflow"

def post_json(url, data):
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GitHubCLI/2.102.0"
        }
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "start"
    state_file = "/data/data/com.termux/files/home/.cache/gh_device_flow.json"

    if mode == "start":
        res = post_json(
            "https://github.com/login/device/code",
            {"client_id": CLIENT_ID, "scope": SCOPES}
        )
        with open(state_file, "w") as f:
            json.dump(res, f)
        user_code = res["user_code"]
        verify_uri = res["verification_uri"]
        try:
            subprocess.run(["termux-clipboard-set", user_code], check=False, timeout=5)
        except Exception:
            pass
        try:
            subprocess.run(["termux-open-url", verify_uri], check=False, timeout=5)
        except Exception:
            pass
        print(f"USER_CODE={user_code}")
        print(f"VERIFY_URI={verify_uri}")
        return

    if mode == "poll":
        repo_name = sys.argv[2] if len(sys.argv) > 2 else "pocket-pwa-factory"
        with open(state_file) as f:
            state = json.load(f)
        device_code = state["device_code"]
        interval = int(state.get("interval", 5)) + 1
        deadline = time.time() + int(state.get("expires_in", 900))

        while time.time() < deadline:
            res = post_json(
                "https://github.com/login/oauth/access_token",
                {
                    "client_id": CLIENT_ID,
                    "device_code": device_code,
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
                }
            )
            if "access_token" in res:
                token = res["access_token"]
                p = subprocess.run(
                    ["gh", "auth", "login", "--with-token"],
                    input=token.encode("utf-8"),
                    capture_output=True
                )
                subprocess.run(["gh", "auth", "setup-git"], check=False)
                create = subprocess.run(
                    [
                        "gh",
                        "repo",
                        "create",
                        repo_name,
                        "--public",
                        "--source=/data/data/com.termux/files/home/pwa-factory",
                        "--remote=origin",
                        "--push"
                    ],
                    capture_output=True,
                    text=True
                )
                print(create.stdout)
                print(create.stderr)
                return
            err = res.get("error")
            if err == "slow_down":
                interval += 5
            elif err != "authorization_pending":
                print(f"ERROR: {res}")
                sys.exit(1)
            time.sleep(interval)

if __name__ == "__main__":
    main()
