# Managing Lab Member Profiles

Each person has their own JSON file in `people/profiles/`. Edit your file to update your profile.

## Update Your Profile

Edit `people/profiles/your-name.json` and commit.

## Add a New Member

1. Copy `people/profiles/_TEMPLATE.json` to `people/profiles/firstname-lastname.json`
2. Fill in the fields (see template for structure)
3. Add photo to `assets/images/people/firstname_lastname.jpg`
4. Add your ID to `people/index.json` in the `"current"` array
5. Commit all changes

## Field Reference

```json
{
  "id": "firstname-lastname",           // Required: same as filename
  "name": "Your Name",                   // Required
  "position": "Graduate Student (PhD)",  // Recommended
  "program": "Your Program",             // Optional
  "affiliation": "",                     // Optional
  "bio": "Brief bio...",                 // Recommended
  "education": ["Degree, Year, School"], // Recommended
  "interests": ["Interest 1", "..."],    // Recommended
  "email": "you@ucsd.edu",               // Required
  "links": [                             // Optional
    {"type": "Github", "url": "https://..."},
    {"type": "Google Scholar", "url": "https://..."}
  ],
  "photo": "firstname_lastname.jpg",     // Optional
  "radar_data": {                        // Optional
    "labels": ["Category1", "Category2", "..."],
    "values": [8, 7, 9, ...]             // 0-10 scale
  }
}
```

## Radar Chart

Optional fun metrics visualization. Define 6-9 categories with values 0-10.

Examples:
- Skills: Python, R, Machine Learning
- Interests: Basketball, Cooking, Movies
- Anything: "Coffee addiction", "Hate for cardio"

## Move to Alumni

Edit `people/index.json`:
- Move your ID from `"current"` to `"alumni"` array
- Optionally update position in your profile JSON

## Naming Conventions

- Profile ID: `firstname-lastname` (hyphens, lowercase)
- JSON file: `firstname-lastname.json`
- Photo file: `firstname_lastname.jpg` (underscores, lowercase)

## Troubleshooting

**Profile missing:** Check your ID is in `people/index.json`
**Photo missing:** Verify filename and path match exactly
**Invalid JSON:** Use https://jsonlint.com/
