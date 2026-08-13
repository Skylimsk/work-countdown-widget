"""Standalone CLI runner for fetching Claude usage JSON."""
import json
import claude_usage

if __name__ == "__main__":
    data = claude_usage.fetch_claude_usage()
    print(json.dumps(data))
