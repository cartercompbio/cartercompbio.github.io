# Carter Lab Website

Official website for the Carter Lab at UC San Diego - Computational Cancer Genomics

## About

This website showcases the research, people, software, and publications from the Carter Lab in the School of Medicine at UC San Diego.

## 📂 Project Structure

```
cartercompbio.github.io/
├── index.html              # Main homepage
├── styles.css              # Global styles
├── navigation.js           # Smooth scroll navigation
├── news.js                 # News section loader
├── people.js               # People section loader
├── assets/
│   └── images/
│       ├── homepage.webp           # Header image
│       ├── research_*.png          # Research area images
│       ├── people/                 # Member photos
│       │   ├── *.jpg/png          # Photos
│       │   └── radar/             # Skill radar charts
│       └── software/              # Software logos
├── latest_news/
│   ├── news_data.json     # All news items
│   ├── archive.html       # News archive page
│   └── detail/
│       └── index.html     # Dynamic news detail template
├── publications/
│   └── publications.json  # All publications with citations
├── people/
│   ├── index.json         # List of current/alumni IDs
│   ├── profiles/
│   │   ├── _TEMPLATE.json # Template for new members
│   │   └── *.json         # Individual profile files
│   └── detail/
│       └── index.html     # Dynamic people detail template
├── HOW_TO_ADD_NEWS.md          # Adding news guide
└── HOW_TO_ADD_PEOPLE.md        # Managing profiles guide
```

---

## ✏️ Common Tasks

### Adding a News Item
See **[HOW_TO_ADD_NEWS.md](HOW_TO_ADD_NEWS.md)** for complete instructions.

Quick: Add entry to `latest_news/news_data.json`

### Adding a Lab Member
See **[HOW_TO_ADD_PEOPLE.md](HOW_TO_ADD_PEOPLE.md)** for complete instructions.

Quick: Create `people/profiles/name.json`, add photo, update `people/index.json`

### Adding a Publication
See **[HOW_TO_ADD_PUBLICATIONS.md](HOW_TO_ADD_PUBLICATIONS.md)** for complete instructions.

Quick: Add entry to `publications/publications.json` with citation text

---

## 🎯 Sections

1. **Home** - Welcome message and lab overview
2. **News** - Latest 6 news items + archive link
3. **Research** - Four main research areas with images
4. **People** - PI, current members, and alumni with detail pages
5. **Software** - Lab software tools with links
6. **Publications** - Selected publications by year
7. **Contact** - Location and contact information

---

## 📚 Documentation

- **[HOW_TO_ADD_NEWS.md](HOW_TO_ADD_NEWS.md)** - Adding news items
- **[HOW_TO_ADD_PEOPLE.md](HOW_TO_ADD_PEOPLE.md)** - Managing lab member profiles
- **[HOW_TO_ADD_PUBLICATIONS.md](HOW_TO_ADD_PUBLICATIONS.md)** - Adding publications

---

## 🎨 Customization

### Colors
The site uses a teal color scheme. To change:
- Main color: `#1e748a` (search and replace in `styles.css`)
- Hover color: `#26a3ba`

### Layout
- Edit `index.html` for structure
- Edit `styles.css` for styling
- All sections use semantic HTML

---

## 📝 Notes

- All images in `assets/images/` subdirectories
- People: Individual profiles in `people/profiles/`, index in `people/index.json`
- News: All items in `latest_news/news_data.json`
- Publications: All citations in `publications/publications.json`
- `.nojekyll` ensures GitHub Pages doesn't use Jekyll processing

---

## Generated with Claude Code

This website was converted from Notion and built with assistance from [Claude Code](https://claude.com/claude-code).
