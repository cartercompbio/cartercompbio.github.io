# The Carter Lab Website

Official website for the Carter Lab at UC San Diego - Computational Cancer Genomics

## About

This website showcases the research, people, software, and publications from the Carter Lab in the School of Medicine at UC San Diego.

## 🚀 Quick Start

### View Locally
```bash
# Open in browser (or use any local server)
open index.html

# Or with Python:
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

### Deploy on GitHub Pages
1. Go to repository Settings → Pages
2. Under "Source", select the `main` branch
3. Click Save
4. Your site will be available at `https://carterlab.github.io`

---

## 📂 Project Structure

```
carterlab.github.io/
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
├── people/
│   ├── people_data.json   # All lab members data
│   └── detail/
│       └── index.html     # Dynamic people detail template
└── docs/
    ├── HOW_TO_ADD_NEWS.md     # Adding news guide
    ├── HOW_TO_ADD_PEOPLE.md   # Adding people guide
    └── IMAGE_GUIDE.md         # Image specifications
```

---

## ✏️ Common Tasks

### Adding a News Item
See **[HOW_TO_ADD_NEWS.md](HOW_TO_ADD_NEWS.md)** for complete instructions.

Quick: Add entry to `latest_news/news_data.json`

### Adding a Lab Member
See **[HOW_TO_ADD_PEOPLE.md](HOW_TO_ADD_PEOPLE.md)** for complete instructions.

Quick: Add entry to `people/people_data.json` and photo to `assets/images/people/`

### Updating Images
See **[IMAGE_GUIDE.md](IMAGE_GUIDE.md)** for image specifications and locations.

---

## 🎨 Features

- ✅ **Responsive Design** - Works on mobile, tablet, and desktop
- ✅ **Dynamic Content** - News and people loaded from JSON files
- ✅ **Clean URLs** - `/people/detail/?id=member-name`
- ✅ **Individual Pages** - Each person and news item has a detail page
- ✅ **News Archive** - All news organized by year
- ✅ **Smooth Navigation** - Animated scrolling between sections
- ✅ **Modern UI** - Teal color theme (#1e748a)
- ✅ **Photo Management** - Placeholder support for missing images

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

## 🔧 Technology

- **Pure HTML/CSS/JavaScript** - No build tools or frameworks required
- **GitHub Pages** - Free hosting
- **JSON Data** - Easy content management
- **No Database** - All data in static JSON files

---

## 📚 Documentation

- **[HOW_TO_ADD_NEWS.md](HOW_TO_ADD_NEWS.md)** - Adding and managing news items
- **[HOW_TO_ADD_PEOPLE.md](HOW_TO_ADD_PEOPLE.md)** - Adding and managing lab members
- **[IMAGE_GUIDE.md](IMAGE_GUIDE.md)** - Image requirements and locations

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

- All images should be in `assets/images/` subdirectories
- People data format is defined in `people/people_data.json`
- News data format is defined in `latest_news/news_data.json`
- `.nojekyll` file ensures GitHub Pages doesn't process files with Jekyll

---

## 🤝 Contributing

1. Make changes to the appropriate files
2. Test locally
3. Commit and push:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. Changes appear on GitHub Pages within minutes

---

## 📞 Support

For questions about updating the website, refer to the documentation files listed above.

## Generated with Claude Code

This website was converted from Notion and built with assistance from [Claude Code](https://claude.com/claude-code).
