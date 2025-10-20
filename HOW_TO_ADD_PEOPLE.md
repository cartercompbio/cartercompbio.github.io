# How to Add or Update Lab Members

This guide explains how to add new lab members or update existing member information on The Carter Lab website.

## Quick Overview

All people information is stored in a single JSON file: **`people/people_data.json`**

The website dynamically loads this data to display:
- People cards on the homepage
- Individual member detail pages
- Photos and radar charts

---

## Adding a New Person

### Step 1: Add Entry to people/people_data.json

Open `people/people_data.json` and add a new entry under either `"current"` or `"alumni"`.

**Template:**
```json
{
  "id": "firstname-lastname",
  "name": "Firstname Lastname, PhD",
  "position": "Graduate Researcher (PhD)",
  "program": "Bioinformatics & Systems Biology",
  "affiliation": "",
  "bio": "Brief biography describing research interests and background...",
  "education": [
    "PhD in Subject, Year",
    "University Name",
    "BS in Subject, Year",
    "University Name"
  ],
  "interests": [
    "Research Interest 1",
    "Research Interest 2",
    "Research Interest 3"
  ],
  "email": "email@ucsd.edu",
  "links": [
    {
      "type": "Twitter",
      "url": "https://twitter.com/username"
    },
    {
      "type": "Github",
      "url": "https://github.com/username"
    },
    {
      "type": "Google Scholar",
      "url": "https://scholar.google.com/citations?user=..."
    }
  ],
  "photo": "firstname_lastname.jpg",
  "radar_chart": "firstname-lastname_radar.png"
}
```

### Step 2: Add Photo (Optional)

If you have a photo:

1. **Name the file:** `firstname_lastname.jpg` (use underscores, lowercase)
2. **Place it in:** `assets/images/people/`
3. **Update JSON:** Set `"photo": "firstname_lastname.jpg"`

If no photo is available, set `"photo": null` and a placeholder will be shown.

### Step 3: Add Radar Chart (Optional)

If you have a skills/interests radar chart:

1. **Name the file:** `firstname-lastname_radar.png` (use hyphens, lowercase)
2. **Place it in:** `assets/images/people/radar/`
3. **Update JSON:** Set `"radar_chart": "firstname-lastname_radar.png"`

If no radar chart is available, set `"radar_chart": null`.

---

## Field Reference

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` | ✅ Yes | Unique identifier (lowercase, hyphens) | `"adam-klie"` |
| `name` | ✅ Yes | Full display name | `"Adam Klie"` |
| `position` | ⚠️ Recommended | Job title/role | `"Graduate Researcher (PhD)"` |
| `program` | ❌ Optional | Academic program | `"Bioinformatics & Systems Biology"` |
| `affiliation` | ❌ Optional | Department/institution | `"UC San Diego, Dept of Medicine"` |
| `bio` | ⚠️ Recommended | Biography paragraph | `"Adam is a Ph.D. student..."` |
| `education` | ⚠️ Recommended | List of degrees | `["B.S. in Engineering, 2017"]` |
| `interests` | ⚠️ Recommended | Research interests | `["Gene regulation", "Deep learning"]` |
| `email` | ⚠️ Recommended | Contact email | `"email@ucsd.edu"` |
| `links` | ❌ Optional | Social/professional links | See link format below |
| `photo` | ❌ Optional | Photo filename | `"firstname_lastname.jpg"` |
| `radar_chart` | ❌ Optional | Radar chart filename | `"firstname-lastname_radar.png"` |

### Link Format

Each link should have a `type` and `url`:

```json
{
  "type": "Twitter",      // Display name
  "url": "https://..."    // Full URL
}
```

Common link types: `Twitter`, `Github`, `Google Scholar`, `LinkedIn`, `Website`

---

## Updating Existing Members

1. Find the person in `people/people_data.json` (search by name)
2. Update the fields you want to change
3. Save the file
4. Refresh the website - changes appear immediately!

---

## Moving Members Between Current and Alumni

To move someone from current members to alumni:

1. **Cut** their entire JSON entry from the `"current"` array
2. **Paste** it into the `"alumni"` array
3. Update their `position` field to reflect their current role (e.g., "Data Scientist at Company X")
4. Save the file

---

## Common Scenarios

### Adding a new graduate student with photo but no radar chart:

```json
{
  "id": "jane-doe",
  "name": "Jane Doe",
  "position": "Graduate Student (PhD, year 1)",
  "program": "Bioengineering",
  "affiliation": "",
  "bio": "Jane is a first-year PhD student...",
  "education": ["B.S. in Biology, 2024", "UCLA"],
  "interests": ["Cancer Biology", "Machine Learning"],
  "email": "jdoe@ucsd.edu",
  "links": [],
  "photo": "jane_doe.jpg",
  "radar_chart": null
}
```

### Adding a postdoc with full information:

```json
{
  "id": "john-smith-phd",
  "name": "John Smith, PhD",
  "position": "Postdoctoral Researcher",
  "program": "",
  "affiliation": "",
  "bio": "John completed his PhD at MIT and joined the lab in 2025...",
  "education": [
    "PhD in Computational Biology, 2024",
    "MIT",
    "BS in Computer Science, 2019",
    "Stanford University"
  ],
  "interests": ["Immunotherapy", "Deep Learning", "Cancer Genomics"],
  "email": "jsmith@ucsd.edu",
  "links": [
    {"type": "Twitter", "url": "https://twitter.com/jsmith"},
    {"type": "Github", "url": "https://github.com/jsmith"},
    {"type": "Google Scholar", "url": "https://scholar.google.com/citations?user=ABC123"}
  ],
  "photo": "john_smith.jpg",
  "radar_chart": "john-smith-phd_radar.png"
}
```

### Moving someone to alumni:

Move their entry from `"current"` to `"alumni"` and update position:

```json
{
  "id": "former-student",
  "name": "Former Student, PhD",
  "position": "Senior Data Scientist at Google",  // Updated!
  "program": "",
  // ... rest of fields stay the same
}
```

---

## Tips

✅ **Use consistent naming:**
- IDs: lowercase with hyphens (`adam-klie`)
- Photos: lowercase with underscores (`adam_klie.jpg`)
- Radar charts: lowercase with hyphens (`adam-klie_radar.png`)

✅ **Test your changes:**
- Open the website locally
- Check the people section on the homepage
- Click on the person card to view their detail page

✅ **Validate JSON:**
- Use a JSON validator if you're unsure about syntax
- Common mistakes: missing commas, extra commas at the end

✅ **Keep it organized:**
- Add new current members at the end of the `"current"` array
- Add new alumni at the end of the `"alumni"` array

---

## Troubleshooting

**Person doesn't appear on website:**
- Check that JSON is valid (no syntax errors)
- Verify the entry is in the correct array (`current` or `alumni`)
- Make sure there's a comma between entries

**Photo doesn't show:**
- Check the filename matches exactly (case-sensitive!)
- Verify the photo is in `assets/images/people/`
- Check the `photo` field in JSON matches the filename

**Radar chart doesn't appear:**
- Check the filename matches exactly
- Verify the chart is in `assets/images/people/radar/`
- Check the `radar_chart` field in JSON matches the filename

---

## Questions?

If you need help, check the existing entries in `people/people_data.json` for examples!
