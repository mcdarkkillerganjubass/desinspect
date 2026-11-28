# Inter

Inter Variable is bundled unmodified from the official [rsms/inter repository](https://github.com/rsms/inter).

- Source: https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.woff2
- Downloaded: 2026-11-25
- SHA-256: `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`
- License: [SIL Open Font License 1.1](LICENSE.txt)

The inspector uses the browser-local family alias “Design Inspect Inter” to avoid changing the host site's font selection. The service worker reads the packaged font and sends its binary data to the main-page inspector; no runtime CDN request or web-accessible font resource is needed.


# Google Sans Code

Google Sans Code Variable is bundled unmodified from the official Google Fonts repository:
https://github.com/google/fonts/blob/main/ofl/googlesanscode/GoogleSansCode%5Bwght%5D.ttf

- Local file: `GoogleSansCode.ttf`
- License: SIL Open Font License 1.1, bundled in `GoogleSansCode-OFL.txt`.
- Table text uses Regular (400), 13px / 18px; descriptions use 11px / 11px.
- Loaded through the extension service worker as “Design Inspect Google Sans Code” to avoid depending on website font policies or changing the host page's fonts.
- Static Zilla Slab section headings retain the original outlined Figma vectors and their line-box offsets.

# Zilla Slab

Zilla Slab Medium is bundled unmodified from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/zillaslab) as `ZillaSlab-Medium.ttf`, with `ZillaSlab-OFL.txt`. Fix notes uses the isolated “Design Inspect Notes Heading” alias at weight 500. Existing vector headings are unchanged.
