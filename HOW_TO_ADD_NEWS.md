# How to Add News - Updated System

Your news system is now super simple! Just edit **one JSON file**.

## Quick Start

Edit: `latest_news/news_data.json`

Add your news entry at the top of the array:

```json
{
  "id": "my-news-2024",
  "title": "Your news title here",
  "date": "2024-12-15",
  "paper": null,
  "github": null,
  "links": []
}
```

Save, commit, push. **Done!**

## Full Example with All Fields

```json
{
  "id": "new-paper-2024",
  "title": "New AI paper published in Nature!",
  "date": "2024-12-15",
  "paper": {
    "title": "Revolutionary AI Method for Cancer Detection",
    "url": "https://nature.com/articles/..."
  },
  "github": "https://github.com/carterlab/new-project",
  "links": [
    {
      "type": "Press Release",
      "url": "https://ucsd.edu/news/..."
    },
    {
      "type": "Twitter",
      "url": "https://twitter.com/..."
    }
  ]
}
```

## Field Reference

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `id` | ✅ Yes | string | Unique URL-friendly ID | `"grievous-2024"` |
| `title` | ✅ Yes | string | News headline | `"Paper published!"` |
| `date` | ✅ Yes | string | Date (YYYY-MM-DD) | `"2024-12-15"` |
| `dateEnd` | ❌ No | string | End date for ranges | `"2024-12-20"` |
| `paper` | ❌ No | object | Paper info | See below |
| `github` | ❌ No | string | GitHub repo URL | `"https://github.com/..."` |
| `links` | ❌ No | array | Additional links | See below |

### Paper Object
```json
"paper": {
  "title": "Full paper title",
  "url": "https://doi.org/..."
}
```

### Links Array
```json
"links": [
  {
    "type": "Press Release",
    "url": "https://..."
  },
  {
    "type": "Twitter",
    "url": "https://x.com/..."
  }
]
```

## Common Scenarios

### 1. Simple Announcement
```json
{
  "id": "john-defense-2024",
  "title": "John Doe successfully defends his thesis!",
  "date": "2024-12-15",
  "paper": null,
  "github": null,
  "links": []
}
```

### 2. Conference/Event (Date Range)
```json
{
  "id": "ismb-2025",
  "title": "Team presents at ISMB 2025, Berlin",
  "date": "2025-07-10",
  "dateEnd": "2025-07-14",
  "paper": null,
  "github": null,
  "links": []
}
```

### 3. Publication with GitHub
```json
{
  "id": "tool-nature-2024",
  "title": "New tool published in Nature Methods!",
  "date": "2024-12-15",
  "paper": {
    "title": "SuperTool: A novel approach to...",
    "url": "https://nature.com/articles/..."
  },
  "github": "https://github.com/carterlab/supertool",
  "links": []
}
```

### 4. Award/Recognition
```json
{
  "id": "jane-siebel-2024",
  "title": "Jane Smith selected as Siebel Scholar!",
  "date": "2024-12-15",
  "paper": null,
  "github": null,
  "links": [
    {
      "type": "Official Announcement",
      "url": "https://siebel.org/..."
    }
  ]
}
```

## Steps to Add

1. **Edit** `latest_news/news_data.json`
2. **Add** your entry at the **top** of the array (after the `[`)
3. **Validate** your JSON (see below)
4. **Commit & Push**:
   ```bash
   git add latest_news/news_data.json
   git commit -m "Add news: Your Title"
   git push
   ```

## Validate JSON

Before pushing, check if JSON is valid:

```bash
python3 -m json.tool latest_news/news_data.json > /dev/null
```

If valid: No output
If invalid: Shows error message

Or use: https://jsonlint.com/

## Tips

- **ID format**: Use lowercase with dashes: `my-news-2024`
- **IDs must be unique**: Check existing IDs first
- **Date format**: Always `YYYY-MM-DD` (e.g., `2024-12-15`)
- **Optional fields**: Set to `null` or `[]` if not needed
- **Quote handling**: JSON uses `"` for strings, escape with `\"`

## Where News Appears

After adding news, it will show:

1. **Homepage** - Shows 6 most recent
2. **Archive** (`latest_news/archive.html`) - Shows ALL news by year
3. **Detail Page** - Individual page at `detail/index.html?id=your-id`

## File Structure

```
latest_news/
  ├── news_data.json       ← Edit this file!
  ├── archive.html         ← All news page (auto-generated view)
  └── detail/
      └── index.html       ← Detail page template (dynamic)
```

## Common Mistakes

❌ **Wrong date format**
```json
"date": "12/15/2024"  // Wrong
"date": "2024-12-15"  // Correct
```

❌ **Missing comma**
```json
{
  "id": "test"
  "title": "Test"  // Missing comma after "test"
}
```

❌ **Trailing comma**
```json
{
  "id": "test",
  "title": "Test",  // Remove this comma before }
}
```

❌ **Duplicate ID**
```json
// Make sure each ID is unique!
```

## Need Help?

- Check existing entries in `news_data.json` for examples
- Use JSON validator: https://jsonlint.com/
- See `NEWS_SYSTEM_UPGRADE.md` for system overview

## No Scripts Needed!

Unlike the old system:
- ❌ No Python scripts to run
- ❌ No CSV files to manage
- ❌ No file creation needed
- ✅ Just edit one JSON file!
