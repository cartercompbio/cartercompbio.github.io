# Adding News Items

Edit `latest_news/news_data.json` and add your entry at the top.

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
  "github": "https://github.com/carterlab/project",
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
| `date` | ✅ Yes | Date in YYYY-MM-DD format |
| `dateEnd` | ❌ Optional | End date for events/conferences |
| `paper` | ❌ Optional | Paper object with title and url |
| `github` | ❌ Optional | GitHub repository URL |
| `links` | ❌ Optional | Array of additional links |

## Notes

- Add new items at the top of the array
- Use unique IDs (check existing ones first)
- Date format: YYYY-MM-DD only
- News appears on homepage (6 most recent) and archive page
