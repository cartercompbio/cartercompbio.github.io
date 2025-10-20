# Image Guide for The Carter Lab Website

Quick reference for all images used on the website.

---

## 📁 Directory Structure

```
assets/images/
├── homepage.webp                   # Header cover image
├── research_immune_trait.png       # Research area 1 image
├── research_germline_interaction.png # Research area 2 image
├── research_cancer_drivers.png     # Research area 3 image
├── people/                         # Lab member photos
│   ├── hannah_carter.png
│   ├── adam_klie.jpeg
│   ├── david_laub.png
│   └── ... (21 total)
│   └── radar/                      # Skill radar charts
│       ├── adam-klie_radar.png
│       ├── david-laub_radar.png
│       └── ... (9 total)
└── software/                       # Software logos
    ├── bento.png
    ├── grievous.png
    ├── eugene.png
    └── genvarloader.png
```

---

## 🎨 Image Specifications

### Header Cover Image
- **File**: `assets/images/homepage.webp`
- **Size**: 1920x400 pixels (recommended)
- **Format**: WebP, JPG, or PNG
- **Usage**: Main banner on homepage

### Research Images
- **Location**: `assets/images/`
- **Files**:
  - `research_immune_trait.png`
  - `research_germline_interaction.png`
  - `research_cancer_drivers.png`
- **Size**: 400-600px wide (recommended)
- **Format**: PNG or JPG
- **Usage**: Displayed alongside research area descriptions

### People Photos
- **Location**: `assets/images/people/`
- **Naming**: `firstname_lastname.jpg` (lowercase, underscores)
- **Size**: 400x400 pixels minimum (square)
- **Format**: JPG or PNG
- **Note**: Displayed as circles, so center faces
- **See also**: `HOW_TO_ADD_PEOPLE.md` for adding new members

### Radar Charts (Skills/Interests)
- **Location**: `assets/images/people/radar/`
- **Naming**: `firstname-lastname_radar.png` (lowercase, hyphens)
- **Size**: Any reasonable size (will be responsive)
- **Format**: PNG (preferred)
- **Usage**: Shown at bottom of individual member pages

### Software Logos
- **Location**: `assets/images/software/`
- **Naming**: `softwarename.png` (lowercase)
- **Size**: 200x200 pixels minimum (square)
- **Format**: PNG (transparent background works great!)
- **Note**: Logos display on white background with border

---

## 📝 Adding New Images

### For People Photos:
See **`HOW_TO_ADD_PEOPLE.md`** for complete instructions.

### For Software Logos:
1. Place PNG file in `assets/images/software/`
2. Update `index.html` in the software section:
   ```html
   <div class="software-card">
       <img src="assets/images/software/yourlogo.png" alt="Your Software" class="software-logo" />
       <h3>Your Software</h3>
       <p>Description...</p>
       <div class="software-links">
           <a href="...">Docs</a> | <a href="...">Paper</a> | <a href="...">GitHub</a>
       </div>
   </div>
   ```

### For Research Images:
1. Place image in `assets/images/`
2. Update the `src` attribute in `index.html`:
   ```html
   <img src="assets/images/your_image.png" alt="Description" />
   ```

---

## 🔧 Tips

✅ **Optimize images** before uploading (compress to reduce file size)

✅ **Use descriptive alt text** for accessibility

✅ **Keep filenames simple** (no spaces, use lowercase)

✅ **Transparent PNGs work great** for software logos

✅ **Square images** work best for people photos and software logos

---

## 🚀 Publishing

After adding/updating images:

```bash
git add assets/images/
git commit -m "Add/update images"
git push
```

Changes will appear on GitHub Pages within a few minutes!
