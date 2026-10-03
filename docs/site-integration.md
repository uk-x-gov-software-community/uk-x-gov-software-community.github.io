# Adding the tracker to the community site

The community site
([uk-x-gov-software-community.github.io](https://github.com/uk-x-gov-software-community/uk-x-gov-software-community.github.io))
needs one script tag in the `<head>` of every page:

```html
<script defer src="https://stats.uk-x-gov-software-community.org.uk/insights.js"
        data-website-id="<website id from Umami>"
        data-domains="www.uk-x-gov-software-community.org.uk"
        data-do-not-track="true"></script>
```

* `insights.js` is whatever `TRACKER_SCRIPT_NAME` is set to. It's `script.js` if
  that isn't set; `script.js` keeps working either way.
* `data-domains` stops visits being counted from local builds and preview copies.
* `data-do-not-track` respects visitors' Do Not Track setting.

## How to add it

The site uses the GOV.UK Eleventy plugin's layouts from `node_modules`, so add the
tag with an Eleventy transform rather than by editing layouts:

1. **`_data/analytics.js`** reads `ANALYTICS_SRC` and `ANALYTICS_WEBSITE_ID` from
   the environment. If either is missing, analytics is off, so local builds never
   report.
2. **`lib/analytics-transform.js`** inserts the tag before `</head>` in `.html`
   output only. Give it unit tests in `tests/` that cover these cases:
   * inserted when configured;
   * nothing when not configured;
   * non-HTML untouched;
   * inserted only once.
3. **`.eleventy.js`**: add `eleventyConfig.addTransform('analytics', ...)`.
4. **`.github/workflows/build.yaml`**: pass `ANALYTICS_SRC` and
   `ANALYTICS_WEBSITE_ID` to the build step from repository variables (`vars.*`).
   The website ID isn't secret.
5. Add a short "Analytics" section to the site's cookies/privacy page:
   * Umami counts page views, referrers, browser, device and country;
   * it uses no cookies and stores no personal data;
   * it's hosted by the community;
   * Do Not Track is respected.

Umami sets no cookies, so the site's cookie banner doesn't need an "analytics
cookies" option for it.
