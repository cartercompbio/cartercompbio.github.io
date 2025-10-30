# Adding Publications

Edit `publications/publications.json` and add your publication entry.

## Minimal Example

```json
{
  "citation": "Author A, Author B, Carter H. Paper title. Journal Name. 2024.",
  "journal": null,
  "labAuthors": null,
  "url": null
}
```

## Full Example with Highlighting

```json
{
  "citation": "Klie A, Laub D, Carter H. Paper title here. Nature. 2024 Aug;40(8):123-456. PMID: 12345678.",
  "journal": "Nature",
  "labAuthors": ["Klie A", "Laub D", "Carter H"],
  "url": "https://doi.org/10.1234/example"
}
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `citation` | ✅ Yes | Full citation text (copy from PubMed/Scholar) |
| `journal` | ❌ Optional | Journal name → gets italicized |
| `labAuthors` | ❌ Optional | Array of lab member names → get bolded |
| `url` | ❌ Optional | Direct paper link (DOI, PubMed, etc.) |

## Organization

Publications grouped by:
- Year: `"2025"`, `"2024"`, etc.
- Special: `"reviews"`, `"protocols"`

## Adding a Publication

1. Copy full citation from PubMed/Google Scholar
2. Paste as `citation` value
3. Optionally add `journal` for italics
4. Optionally list `labAuthors` for bold
5. Optionally add `url` for link
6. Add to appropriate year array

**Example:**

```json
"2024": [
  {
    "citation": "Your full citation text here...",
    "journal": "Journal Name",
    "labAuthors": ["Carter H", "Author X"],
    "url": "https://doi.org/..."
  },
  ... other 2024 papers
]
```

## Notes

- Citations display as-is, with highlighting applied
- Journal name must match exactly what's in citation text
- Lab author names must match exactly (including initials)
- Add to top of year array for most recent first
