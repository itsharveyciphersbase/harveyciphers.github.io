# Jekyll starter

A working, copy-paste-ready Jekyll site demonstrating the parts of the built-in
GitHub Pages build that the main playground cannot show, because the playground
deliberately runs with `.nojekyll` and no build step.

## Why it is not built by this repository

The site at the repository root is plain static HTML. Turning on Jekyll for the
whole repo would make Liquid try to parse the `{{ }}` and `{% %}` sequences that
appear inside the playground's own code samples, which breaks them. Keeping the
Jekyll demo in `examples/` avoids that conflict.

To see it build, either:

1. **Copy it into a repository of its own.** Move the contents of this directory
   to the root, push, and enable Pages. No workflow file is needed.
2. **Run the workflow.** `.github/workflows/jekyll-example.yml` in this
   repository builds this directory on demand. It is `workflow_dispatch` only,
   so it never interferes with the main deployment.
3. **Preview locally:**

   ```bash
   bundle install
   bundle exec jekyll serve --baseurl ''
   ```

## What each file demonstrates

| Path | Demonstrates |
| --- | --- |
| `_config.yml` | Site config, `baseurl` for project pages, the plugin allowlist, a custom collection, and front-matter defaults |
| `_layouts/default.html` | The base layout, plus `{% seo %}` and `{% feed_meta %}` from allowlisted plugins |
| `_layouts/post.html` | Layout inheritance and computed reading time |
| `_includes/nav.html` | An include driven by a data file, using `relative_url` for subpath safety |
| `_data/navigation.yml` | A data file surfaced as `site.data.navigation` |
| `_posts/*.md` | Blog posts, excerpts, tags, and `redirect_from` |
| `_tutorials/*.md` | A custom collection with its own permalink scheme |
| `index.md` | Liquid loops, `group_by` taxonomy, and collection listing |

## The plugin allowlist

The built-in build permits only a fixed set of plugins. The four used here —
`jekyll-feed`, `jekyll-sitemap`, `jekyll-seo-tag`, and `jekyll-redirect-from` —
are among the most useful. Adding a gem outside the list to your `Gemfile` does
nothing: the built-in build ignores it silently.

If you need an unlisted plugin, build with GitHub Actions instead. See
`.github/workflows/deploy.yml` for the shape of that pipeline.
