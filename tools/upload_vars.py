#!/usr/bin/env python3
"""Prints the themeFilesUpsert variables for the given theme files, pointing Shopify at the
pushed commit on GitHub (body type URL). Usage: python3 tools/upload_vars.py <themeId> <file>..."""
import json, subprocess, sys
sha = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
theme, files = sys.argv[1], sys.argv[2:]
base = 'https://raw.githubusercontent.com/mylorinx-svg/lorinx-app/%s/theme/' % sha
print(json.dumps({'themeId': 'gid://shopify/OnlineStoreTheme/' + theme,
                  'files': [{'filename': f, 'body': {'type': 'URL', 'value': base + f}} for f in files]}))
