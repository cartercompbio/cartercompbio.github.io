# Carter Lab Website

Official website for the Carter Lab at UC San Diego - Computational Cancer Genomics

## About

This website showcases the research, people, software, and publications from the Carter Lab in the School of Medicine at UC San Diego.

## 📂 Project Structure

```
cartercompbio.github.io/
├── index.html              # Main homepage
├── styles.css              # Global styles (colors are variables at the top)
├── navigation.js           # Nav menu and scrolling to sections
├── news.js                 # Homepage news section loader
├── news-dates.js           # Date parsing/formatting shared by the news pages
├── people.js               # People section loader (tabs, lab photos)
├── publications.js         # Publications section loader
├── assets/
│   ├── hero/                       # Homepage animation (Three.js modules)
│   └── images/
│       ├── logo/                   # Lab logo, its depth map, and favicon
│       ├── research_*.png          # Research area images
│       ├── people/                 # Member photos (*.jpg/png)
│       └── software/               # Software logos
├── news/
│   ├── news_data.json     # All news items
│   ├── index.html         # News page (all items, by year)
│   └── item/
│       └── index.html     # Dynamic news item template
├── latest_news/           # Old addresses; forward to news/
├── publications/
│   └── publications.json  # All publications with citations
├── people/
│   ├── index.json         # List of current/alumni IDs (display order)
│   ├── photos.json        # Lab Photos tab
│   ├── profiles/
│   │   ├── _TEMPLATE.json # Template for new members
│   │   └── *.json         # Individual profile files
│   └── detail/
│       └── index.html     # Dynamic people detail template
├── HOW_TO_ADD_NEWS.md          # Adding news guide
├── HOW_TO_ADD_PEOPLE.md        # Managing profiles guide
└── HOW_TO_ADD_PUBLICATIONS.md  # Adding publications guide
```

---

## ✏️ Common Tasks

### Adding a News Item
See **[HOW_TO_ADD_NEWS.md](HOW_TO_ADD_NEWS.md)** for complete instructions.

Quick: Add entry to `news/news_data.json`

### Adding a Lab Member
See **[HOW_TO_ADD_PEOPLE.md](HOW_TO_ADD_PEOPLE.md)** for complete instructions.

Quick: Create `people/profiles/name.json`, add photo, update `people/index.json`

### Adding a Publication
See **[HOW_TO_ADD_PUBLICATIONS.md](HOW_TO_ADD_PUBLICATIONS.md)** for complete instructions.

Quick: Add entry to `publications/publications.json` with citation text

---

## 🎯 Sections

1. **Home** - Animated header, welcome message and lab overview
2. **News** - Latest 6 news items + link to the News page
3. **Research** - Four main research areas
4. **People** - Tabs for Current Team (PI and members), Alumni and Lab Photos, with a detail page per person
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
Colors are CSS variables in `:root` at the top of `styles.css`:
- Main (teal) color: `--accent`
- Darker teal: `--accent-strong`
- Text, headings, backgrounds and lines: `--text`, `--ink`, `--page-bg`, `--surface`, `--line`

The homepage animation's colors are set in `assets/hero/`; its text labels use the `--hero-*` and `--lbl-*` variables in `styles.css`.

### Layout
- Edit `index.html` for structure
- Edit `styles.css` for styling
- All sections use semantic HTML

---

## 📝 Notes

- All images in `assets/images/` subdirectories
- People: Individual profiles in `people/profiles/`, index in `people/index.json`
- News: All items in `news/news_data.json`
- Publications: All citations in `publications/publications.json`
- `.nojekyll` ensures GitHub Pages doesn't use Jekyll processing
