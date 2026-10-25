# Adding News Items

Edit `news/news_data.json` and add your entry.

## Minimal Example

```json
{
  "id": "my-news-2024",
  "title": "Your news title",
  "date": "2024-12-15",
  "paper": null,
  "github": null,
  "links": []
}
```

## Full Example

```json
{
  "id": "new-paper-2024",
  "title": "Paper published in Nature",
  "date": "2024-12-15",
  "dateEnd": "2024-12-20",  // Optional: for date ranges
  "paper": {
    "title": "Full paper title",
    "url": "https://doi.org/..."
  },
  "github": "https://github.com/cartercompbio/project",
  "links": [
    {"type": "Press Release", "url": "https://..."},
    {"type": "Twitter", "url": "https://..."}
  ]
}
```

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ Yes | Unique identifier (lowercase-with-dashes) |
| `title` | ✅ Yes | News headline |
| `date` | ✅ Yes | Date in YYYY-MM-DD format, or YYYY-MM if only the month is known |
| `dateEnd` | ❌ Optional | End date for events/conferences |
| `paper` | ❌ Optional | Paper object with title and url |
| `github` | ❌ Optional | GitHub repository URL |
| `links` | ❌ Optional | Array of additional links |

## Notes

- Items are sorted by date automatically, so position in the file doesn't matter (adding at the top keeps it easy to read)
- Use unique IDs (check existing ones first)
- Date format: YYYY-MM-DD, or YYYY-MM to show just the month (e.g. "July 2024")
- News appears on homepage (6 most recent) and the News page (`news/`)
