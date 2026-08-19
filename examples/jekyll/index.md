---
layout: default
title: Home
---

# {{ site.title }}

{{ site.tagline }}

## Latest posts

{%- comment -%}
  `site.posts` is populated automatically from _posts/. Filenames must be
  YYYY-MM-DD-slug.md or Jekyll ignores them entirely — a silent failure that
  catches everyone once.
{%- endcomment -%}

<ul class="post-list">
  {%- for post in site.posts limit: 5 %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%-d %b %Y' }}</time>
    <p>{{ post.excerpt | strip_html | truncate: 140 }}</p>
  </li>
  {%- endfor %}
</ul>

## Tutorials

{%- comment -%}
  A custom collection, declared in _config.yml, accessed as site.<name>.
{%- endcomment -%}

<ul>
  {%- for tutorial in site.tutorials %}
  <li><a href="{{ tutorial.url | relative_url }}">{{ tutorial.title }}</a></li>
  {%- endfor %}
</ul>

## Posts by topic

{%- comment -%}
  group_by turns a flat list into a taxonomy with no plugin at all.
{%- endcomment -%}

{% assign by_topic = site.posts | group_by: 'topic' %}
{%- for group in by_topic %}
- **{{ group.name | capitalize }}** — {{ group.items | size }} post{% if group.items.size != 1 %}s{% endif %}
{%- endfor %}
