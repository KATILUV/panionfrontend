# Web Scraper Plugin

A Panion plugin for scraping data from websites with respect for robots.txt and rate limiting.

## Features

- Respects robots.txt rules
- Rate limiting to prevent overloading servers
- Configurable user agent
- Automatic retries with exponential backoff
- Extracts various types of content:
  - Page title
  - Meta description
  - Links
  - Text content
  - Custom elements via CSS selectors

## Configuration

The plugin can be configured through the `metadata.yaml` file:

```yaml
config:
  user_agent: "Panion Web Scraper/1.0.0"
  timeout: 30
  max_retries: 3
  respect_robots_txt: true
  default_encoding: "utf-8"
```

## Usage

Example usage in a goal:

```python
goal = Goal(
    id="scrape_website",
    description="Scrape a website for content",
    priority=1.0,
    status="pending",
    required_plugins=["web_scraper"],
    parameters={
        "url": "https://example.com",
        "extract_title": True,
        "extract_meta": True,
        "extract_links": True,
        "extract_text": True,
        "selectors": {
            "headings": "h1, h2, h3",
            "paragraphs": "p"
        }
    }
)
```

## Security

- The plugin runs with restricted security level
- Respects robots.txt by default
- Implements rate limiting
- Uses proper user agent identification
- Handles errors gracefully

## Dependencies

- requests>=2.31.0
- beautifulsoup4>=4.12.0 