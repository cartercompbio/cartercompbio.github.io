# Image Upload Guide

This guide explains where to upload images for the Carter Lab website.

## Directory Structure

```
assets/
  images/
    - leadimage4.jpg                    (Header cover image)
    - research1.png                     (Genetic determinants research)
    - research2.png                     (Inherited genome interactions)
    - research3.png                     (Cancer drivers research)
    people/
      - hannah_carter.png               (Principal Investigator)
      - adam_klie.jpeg
      - kivilcim_ozturk.jpg
      - tj_sears.jpeg
      - james_talwar.png
      - david_laub.png
      - douglas_meyer.jpg
      - sural_ranamukhaarachchi.jpg
      - kohan_lee.jpg
      - andrea_castro.jpg
      - michelle_dow.png
      - rachel_pyke.jpg
      - cameron_waller.jpg
      - brian_tsui.png
      - clarence_mah.png
      - meghana_pagadala.png
      - billur_engin.jpg
      - lucia_bazan.png
      - su_xian.jpg
      - rohil_ahuja.jpg
      - divya_kirani.jpg
    software/
      - bento.png                       (Bento logo)
      - grievous.png                    (GRIEVOUS logo)
      - eugene.png                      (EUGENe logo)
      - genvarloader.png                (GenVarLoader logo)
```

## Image Requirements

### Header Cover Image
- **File**: `assets/images/leadimage4.jpg`
- **Recommended size**: 1920x400 pixels
- **Format**: JPG

### Research Images
- **Files**: `assets/images/research1.png`, `research2.png`, `research3.png`
- **Recommended size**: 400x300 pixels
- **Format**: PNG or JPG

### People Photos
- **Location**: `assets/images/people/`
- **Recommended size**: 400x400 pixels (square)
- **Format**: JPG or PNG
- **Note**: Photos will be displayed as circles, so ensure faces are centered

### Software Logos
- **Location**: `assets/images/software/`
- **Recommended size**: 200x200 pixels (square)
- **Format**: PNG (with transparent background preferred)

## Original Notion Files

The original exported files from Notion are located in the directory:
`The Carter Lab 124614c65c4680038d97ed0273b0bdc4/`

You can extract images from there and rename/move them to the appropriate locations listed above.

## How to Upload

1. Place your images in the appropriate directories as listed above
2. Make sure the filenames match exactly (case-sensitive)
3. If you use different filenames, update the `src` attributes in `index.html`

## Viewing Locally

To view the website locally before publishing:
1. Open `index.html` in your web browser
2. Images that haven't been uploaded yet will show a placeholder pattern

## Publishing to GitHub Pages

Once images are uploaded, commit and push to GitHub:
```bash
git add .
git commit -m "Add website content and images"
git push
```

Then enable GitHub Pages in your repository settings (Settings > Pages > Source: main branch).
