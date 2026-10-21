# comm-inspector-preview

Unindexed review copy of the AI Comms Inspector site, used to iterate on the homepage test variant
(`index-v2.html`) before anything goes near the live site. **Not the live site.**

- Every page is `noindex`; Cookiebot and Google Analytics are stripped so preview visits don't touch
  production analytics.
- Contact forms still post to the real inbox, so don't submit test data you don't mean to send.
- Refresh with `python sync-from-dev.py <path-to-ACI-Web-repo> [files...]`, then commit and push.
