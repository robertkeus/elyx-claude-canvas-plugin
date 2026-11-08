# Free icon libraries

260 open icon sets with 465,618 icons, all served as SVG by the free [Iconify API](https://iconify.design/docs/api/). Look icons up here and fetch them directly; there is no need to search the web. Generated from `https://api.iconify.design/collections`.

## Get an icon

1. Pick **one set per design**: stroke weight, grid and corner style must match. Start from the picks below.
2. Find names: `curl -s "https://api.iconify.design/search?query=<word>&prefix=<set>&limit=20"` returns `"icons": ["<set>:<name>", …]`.
   Every name in a set: `curl -s "https://api.iconify.design/collection?prefix=<set>"`. Browse visually: `https://icon-sets.iconify.design/<set>/`.
3. Save it into the project's icons folder: `curl -s "https://api.iconify.design/<set>/<name>.svg" -o icons/<set>-<name>.svg`.
   Weights and styles are separate names: Phosphor `-thin` `-light` `-bold` `-fill` `-duotone`; Heroicons `-solid` `-20-solid` `-16-solid`;
   Material Symbols (filled by default) `-outline` `-rounded` `-outline-rounded`; Tabler `-filled`; Solar `-linear` `-outline` `-bold` `-broken` `-line-duotone` `-bold-duotone`.
4. Use it: `import "icons/<set>-<name>.svg" as rocket`, then `asset {width: 20px, height: 20px, contents: rocket, fill: <color>}`.
   A solid `fill` tints single-colour icons (stroke, solid and duotone). Multicolour sets keep their colours: give them no fill.

Size icons on the grid they were drawn for (24px sets at 16/20/24/32, 16px sets at 16/32) and keep them optically level with the text beside them.

## Licenses

- **Free for any use, no credit needed:** MIT, ISC, Apache-2.0, CC0-1.0, Unlicense, BSD-3-Clause, OFL-1.1.
- **(credit):** CC-BY, free for commercial use but credit the author in the project's notices.
- **⚠:** CC-BY-SA, GPL or MPL. Share-alike or copyleft terms; avoid in client work unless the project's license allows it.
- **⛔:** CC-BY-NC, non-commercial only. Don't use.
- Logo and brand sets show real trademarks: use them only to depict that real product (an integrations row), never for invented brands.

## Picks per style

| Style | Sets | How |
| --- | --- | --- |
| studio | `ph`, `lucide` | Phosphor regular or bold; `-duotone` for one warm signature moment. |
| midnight | `lucide`, `tabler` | 1.5–2px strokes read well on black; keep icons at 60–80% white. |
| editorial | `iconoir`, `ph` | Thin, quiet strokes (`ph:*-thin`, `-light`); use few icons, let type lead. |
| swiss | `carbon`, `material-symbols` | Square and geometric: Carbon's flat stroke ends suit radius 0; use plain Material Symbols, never `-rounded`. |
| soft | `solar`, `ph`, `fluent-emoji-flat` | Solar `-bold-duotone` and Phosphor `-duotone` for friendly UI; Fluent Emoji Flat for stickers. |
| clean | `heroicons`, `tabler`, `lucide` | Heroicons outline in UI, `-20-solid` / `-16-solid` in dense tables and badges. |

## Picks per need

- **General UI, large sets:** `lucide` (Lucide, 2,029, ISC), `tabler` (Tabler Icons, 6,257, MIT), `ph` (Phosphor, 9,072, MIT), `hugeicons` (Huge Icons, 6,065, MIT), `mingcute` (MingCute Icon, 4,526, Apache-2.0), `iconoir` (Iconoir, 1,671, MIT), `ri` (Remix Icon, 3,188, Apache-2.0), `solar` (Solar, 8,706, CC-BY-4.0 (credit))
- **Outline + filled pairs:** `ph` (Phosphor, 9,072, MIT), `fluent` (Fluent UI System Icons, 19,945, MIT), `material-symbols` (Material Symbols, 15,777, Apache-2.0), `heroicons` (HeroIcons, 1,288, MIT), `mingcute` (MingCute Icon, 4,526, Apache-2.0), `ri` (Remix Icon, 3,188, Apache-2.0), `tabler` (Tabler Icons, 6,257, MIT)
- **Dense 16px UI:** `gravity-ui` (Gravity UI Icons, 809, MIT), `octicon` (Octicons, 780, MIT), `radix-icons` (Radix Icons, 332, MIT), `bi` (Bootstrap Icons, 2,078, MIT), `carbon` (Carbon, 2,644, Apache-2.0)
- **Duotone / playful:** `ph` (Phosphor, 9,072, MIT), `solar` (Solar, 8,706, CC-BY-4.0 (credit)), `streamline` (Streamline, 3,000, CC-BY-4.0 (credit)), `icon-park-outline` (IconPark Outline, 2,658, Apache-2.0)
- **Emoji and stickers:** `fluent-emoji-flat` (Fluent Emoji Flat, 3,145, MIT), `noto` (Noto Emoji, 3,729, Apache-2.0), `twemoji` (Twitter Emoji, 3,988, CC-BY-4.0 (credit)), `streamline-emojis` (Streamline Emojis, 787, CC-BY-4.0 (credit))
- **Flags:** `circle-flags` (Circle Flags, 444, MIT), `flag` (Flag Icons, 542, MIT)
- **Tech and brand logos (real trademarks):** `logos` (SVG Logos, 2,064, CC0-1.0), `simple-icons` (Simple Icons, 3,467, CC0-1.0), `devicon` (Devicon, 1,111, MIT), `skill-icons` (Skill Icons, 400, MIT)
- **Crypto and web3:** `cryptocurrency-color` (Cryptocurrency Color Icons, 483, CC0-1.0), `token-branded` (Web3 Icons Branded, 4,085, MIT)
- **Weather:** `meteocons` (Meteocons, 447, MIT), `wi` (Weather Icons, 219, OFL-1.1)
- **Health and medical:** `healthicons` (Health Icons, 2,128, MIT)
- **Maps and places:** `maki` (Maki, 215, CC0-1.0), `temaki` (Temaki, 557, CC0-1.0)
- **Pixel / retro:** `pixelarticons` (Pixelarticons, 1,036, MIT)
- **Games and fantasy:** `game-icons` (Game Icons, 4,133, CC-BY-3.0 (credit))
- **Loaders (animated SVG; Elyx draws them static):** `svg-spinners` (SVG Spinners, 46, MIT), `line-md` (Material Line Icons, 1,218, MIT)

## All sets

### UI 24px

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `iconmind` | IconMind | 31,722 | MIT | 24 | stroke, precise | agent-outline-regular, vector-database-duotone-thin, stub-tool-outline-bold, crop-outline-bold |
| `coolicons` | coolicons | 19,860 | MIT | 24 | stroke, precise | battery-empty-duotone-round, venus-fill-round, apple-logo-duocolor-round, mouse-fill-round |
| `iconoven` | IconOven | 18,236 | MIT | 24 | stroke, precise | bell, home, credit-card, bell-sharp |
| `keyline-icons` | Keyline Icons | 13,536 | MIT | 24 | stroke, precise | arrow-up-narrow-wide-duotone, credit-card-fill, upload, activity |
| `solar` | Solar | 8,706 | CC-BY-4.0 (credit) | 24 | stroke, precise | magnifier-zoom-out-broken, armchair-2-bold-duotone, traffic-economy-line-duotone, user-rounded-bold-duotone |
| `withicons` | with icons | 7,000 | MIT | 24 | stroke | home, search-duo, settings-solid, book-duo |
| `reicon` | Reicon | 6,590 | MIT | 24 | solid | ruler4, cart-add2-filled, search-normal2, command-filled |
| `tabler` | Tabler Icons | 6,257 | MIT | 24 | stroke, precise | alien, device-desktop, photo, chevron-right |
| `hugeicons` | Huge Icons | 6,065 | MIT | 24 | stroke | analytics-up, android, search-02, tick-02 |
| `mingcute` | MingCute Icon | 4,526 | Apache-2.0 | 24 | precise | edit-3-line, alert-fill, riding-line, layout-9-line |
| `boxicons` | Boxicons | 3,768 | MIT | 24 | precise | clock-2-filled, desk, battery-filled, crop |
| `ri` | Remix Icon | 3,188 | Apache-2.0 | 24 | precise | lock-2-line, mark-pen-fill, moon-line, filter-2-fill |
| `lucide-extended` | Lucide Extended | 2,879 | ISC | 24 | stroke, precise | circle-check-filled, award-duotone, house-filled, navigation-duotone |
| `andrsrxn` | andrsrxn/icons | 2,773 | MIT | 24 | stroke, precise | agent, hashtag, box, diff |
| `icon-park-outline` | IconPark Outline | 2,658 | Apache-2.0 | 24 | stroke, precise | add-one, english-mustache, basketball-clothes, sort |
| `mynaui` | Myna UI Icons | 2,620 | MIT | 24 | stroke | signal, power, tree, cart |
| `tdesign` | TDesign Icons | 2,358 | MIT | 24 | stroke | activity, doge, dam, view-list |
| `lucide` | Lucide | 2,029 | ISC | 24 | stroke, precise | circle-check, award, house, check |
| `vadivam` | Vadivam | 2,020 | MIT | 24 | stroke, precise | axis-3d, flag, app-window-mac, frame |
| `griddy-icons` | Griddy Icons | 2,010 | MIT | 24 | precise | annotation, twitch-filled, chart-bar-up-alt, framer-filled |
| `streamline-ultimate` | Ultimate free icons | 1,999 | CC-BY-4.0 (credit) | 24 | stroke | power-button, arrow-right, stairs-descend, mouse-smart-bold |
| `icon-park-solid` | IconPark Solid | 1,947 | Apache-2.0 | 24 | stroke, precise | add-one, english-mustache, basketball-clothes, sort |
| `icon-park-twotone` | IconPark TwoTone | 1,944 | Apache-2.0 | 24 | stroke, precise | add-one, english-mustache, basketball-clothes, sort |
| `iconamoon` | IconaMoon | 1,781 | CC-BY-4.0 (credit) | 24 | stroke | shield-off-thin, lightning-1-duotone, player-previous-fill, folder-remove-duotone |
| `iconoir` | Iconoir | 1,671 | MIT | 24 | stroke | chat-bubble-check, edit, activity, check |
| `lets-icons` | Lets Icons | 1,528 | CC-BY-4.0 (credit) | 24 | stroke | search-duotone-line, view-alt, message-duotone, remote-light |
| `streamline-sharp` | Sharp free icons | 1,500 | CC-BY-4.0 (credit) | 24 | solid | home-1, paperclip-2, new-folder, check |
| `streamline-plump` | Plump free icons | 1,499 | CC-BY-4.0 (credit) | 24 | solid | smiley-indiferent, music-note-2, web, circle-clock |
| `si` | Sargam Icons | 1,299 | MIT | 24 | stroke | eject-duotone, zoom-in-line, play-duotone, add-fill |
| `uil` | Unicons | 1,215 | Apache-2.0 | 24 | solid | arrow-circle-right, chat-bubble-user, edit-alt, grids |
| `mage` | Mage Icons | 1,042 | Apache-2.0 | 24 | stroke | chart-25, music-fill, coin-a-fill, multiply |
| `pixelarticons` | Pixelarticons | 1,036 | MIT | 24 | precise | home, arrows-horizontal, heart, tab |
| `stash` | Stash Icons | 982 | MIT | 24 | precise | cloud-solid, clock-duotone, search-duotone, check-solid |
| `jam` | Jam Icons | 940 | MIT | 24 | solid | chevrons-square-up-right, luggage-f, rubber, capsule-f |
| `bx` | BoxIcons v2 | 814 | MIT | 24 | precise | heart-circle, last-page, bar-chart-square, stop |
| `majesticons` | Majesticons | 760 | MIT | 24 | stroke, precise | chats-line, home, edit-pen-4-line, pulse |
| `flowbite` | Flowbite Icons | 751 | MIT | 24 | stroke | user-outline, vue-solid, list-outline, bars-from-left-outline |
| `gg` | css.gg | 704 | MIT | 24 | precise | align-left, server, overflow, edit-flip-v |
| `bxs` | BoxIcons v2 Solid | 665 | MIT | 24 | precise | edit-alt, tree-alt, circle-half, eject |
| `lineicons` | Lineicons | 606 | MIT | mixed | solid | check, vuejs, star-fat, unsplash |
| `pixel` | Pixel Icon | 578 | CC-BY-4.0 (credit) | 24 | precise | folder-solid, message, bullet-list, heading-1-solid |
| `proicons` | ProIcons | 544 | MIT | 24 | stroke, precise | code, checkmark, photo-filter, soundwave |
| `streamline-cyber` | Cyber free icons | 500 | CC-BY-4.0 (credit) | 24 | precise | music-note-1, navigation-up-arrow, map-direction, glass-1 |
| `basil` | Basil | 493 | CC-BY-4.0 (credit) | 24 | solid | comment-solid, search-outline, lightning-alt-solid, check-outline |
| `akar-icons` | Akar Icons | 454 | MIT | 24 | stroke, precise | paper, pencil, location, sort |
| `meteor-icons` | Meteor Icons | 409 | MIT | 24 | stroke, precise | droplet, bolt, flipboard, filter |
| `lucide-lab` | Lucide Lab | 373 | ISC | 24 | stroke, precise | venn, card-credit, pac-man, cent |
| `guidance` | Guidance | 360 | CC-BY-4.0 (credit) | 24 | precise | smoking-area, playground, glass, paper |
| `wordpress` | WordPress Icons | 344 | GPL-2.0-or-later ⚠ | 24 | solid | home, pencil, corner-top-right, funnel |
| `typcn` | Typicons | 336 | CC-BY-SA-4.0 ⚠ | 24 | precise | pin-outline, cloud-storage, bell, media-eject |
| `bitcoin-icons` | Bitcoin Icons | 330 | MIT | 24 | precise | exchange-outline, brush-filled, satoshi-v3-outline, unlock-filled |
| `prime` | Prime Icons | 313 | MIT | 24 | solid | book, telegram, volume-off, check |
| `matita` | Matita | 302 | MIT | 24 | stroke | crop, activity, navigation, play |
| `struq` | Struq Icons | 300 | MIT | 24 | stroke | home, search, settings, play |
| `uim` | Unicons Monochrome | 298 | Apache-2.0 | 24 | solid | airplay, circle-layer, lock-access, comment-alt-message |
| `circum` | Circum Icons | 288 | MPL-2.0 ⚠ | 24 | solid | text, pill, zoom-out, voicemail |
| `humbleicons` | Humbleicons | 286 | MIT | 24 | stroke, precise | aid, droplet, rss, volume |
| `fe` | Feather Icon | 255 | MIT | 24 | precise | add-cart, comments, link-external, check |
| `eos-icons` | EOS Icons | 253 | MIT | 24 | solid | modified-date-outlined, arrow-rotate, package, enhancement |
| `uit` | Unicons Thin Line | 216 | Apache-2.0 | 24 | solid | circuit, favorite, toggle-on, web-section |
| `gridicons` | Gridicons | 207 | GPL-2.0-only ⚠ | 24 | precise | code, multiple-users, types, dropdown |
| `doodle-icons` | Oreo Doodle Icons | 204 | MIT | 48 | stroke | heart, home, bell, circle-alert |
| `uis` | Unicons Solid | 190 | Apache-2.0 | 24 | solid | analysis, user-md, bookmark, window-grid |
| `cuida` | Cuida Icons | 182 | Apache-2.0 | 24 | precise | sidebar-expand-outline, filter-outline, caret-up-outline, check-outline |
| `mi` | Mono Icons | 180 | MIT | 24 | precise | bar-chart, cloud-upload, log-out, board |
| `weui` | WeUI Icon | 162 | MIT | 24 | solid | search-outlined, clip-filled, done-filled, more-filled |
| `duo-icons` | Duoicons | 91 | MIT | 24 | precise | credit-card, check-circle, box, folder-open |
| `svg-spinners` | SVG Spinners | 46 | MIT | 24 | precise, animated | tadpole, pulse, 3-dots-rotate, 90-ring |

### UI 16px / 32px

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `carbon` | Carbon | 2,644 | Apache-2.0 | 32 | precise | user-certification, humidity, edit-off, flag-filled |
| `bi` | Bootstrap Icons | 2,078 | MIT | 16 | precise | graph-up, card-image, code-slash, egg-fill |
| `ion` | IonIcons | 1,357 | MIT | 32 | precise | code-download-sharp, contrast-outline, checkmark-done, navigate-sharp |
| `famicons` | Famicons | 1,342 | MIT | 32 | precise | backspace-outline, home-sharp, bluetooth-outline, glasses-sharp |
| `ant-design` | Ant Design Icons | 848 | MIT | 16 | solid | pushpin-filled, pie-chart-outlined, shopping-twotone, layout-outlined |
| `gravity-ui` | Gravity UI Icons | 809 | MIT | 16 | precise | magnifier, bookmark-fill, display, italic |
| `lsicon` | Lsicon | 716 | MIT | 16 | precise | pointer-outline, column-filled, vip-outline, area-chart-outline |
| `streamline-pixel` | Pixel free icons | 662 | CC-BY-4.0 (credit) | 32 | precise | shopping-shipping-bag-1, interface-essential-battery, social-rewards-flag, interface-essential-synchronize-arrows-square-2 |
| `at-icons` | @icons | 642 | MIT | 16 | precise | shield, checkerboard, ladder, sprout |
| `cil` | CoreUI Free | 554 | CC-BY-4.0 (credit) | 32 | solid | airplane-mode-off, badge, color-border, bookmark |
| `streamline-block` | Streamline Block | 300 | CC-BY-4.0 (credit) | 16 | precise | other-ui-chat, content-write, content-bookmark, nature-lightning |
| `ep` | Element Plus | 293 | MIT | 32 | precise | home-filled, partly-cloudy, avatar, briefcase |
| `charm` | Charm Icons | 261 | MIT | 16 | stroke | chart-line, image, thumb-up, diamond |
| `rivet-icons` | Rivet Icons | 210 | BSD-3-Clause | 16 | precise | lightning, credit-card-solid, pause, bookmark-solid |
| `formkit` | FormKit Icons | 144 | MIT | mixed | precise | checkbox, reorder, submit, check |
| `quill` | Quill Icons | 140 | MIT | 32 | stroke, precise | collapse, desktop, moon, download |
| `nimbus` | Nimbus | 140 | MIT | 16 | solid | barcode, mail, calendar, mobile |
| `bytesize` | Bytesize Icons | 101 | MIT | 32 | stroke, precise | desktop, code, sign-out, checkmark |

### UI Other / Mixed Grid

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `fluent` | Fluent UI System Icons | 19,945 | MIT | mixed | precise | zoom-out-24-filled, drink-coffee-24-regular, photo-filter-24-regular, checkmark-24-filled |
| `ph` | Phosphor | 9,072 | MIT | 24 | solid | folder-open-duotone, check-square-offset-thin, pencil-line-fill, check-thin |
| `energy-icons` | Energy Icons | 8,252 | MIT | mixed | solid | hex-key-48, bookmark-48, brackets-48, check-48 |
| `glyphs` | Glyphs | 3,452 | MIT | mixed | solid | mouse-2-bold, object-select, comment-1-duo, asterisk-outline |
| `streamline` | Streamline | 3,000 | CC-BY-4.0 (credit) | 28 | solid | sign-hashtag, open-umbrella-solid, graph-bar-increase, camping-tent |
| `fa7-solid` | Font Awesome Solid | 2,000 | CC-BY-4.0 (credit) | 32 | precise | location-pin, gem, folder, mound |
| `streamline-flex` | Flex free icons | 1,500 | CC-BY-4.0 (credit) | 28 | solid | shield-2, number-sign, heart, merge-vertical |
| `garden` | Garden SVG Icons | 1,491 | Apache-2.0 | mixed | precise | asterisk-20, bookmark-fill-20, moon-fill-20, folder-fill-20 |
| `ix` | Siemens Industrial Experience Icons | 1,490 | MIT | mixed | solid | notification-filled, home-filled, panel-ipc, plant-filled |
| `heroicons` | HeroIcons | 1,288 | MIT | mixed | solid | camera, building-library, receipt-refund, bookmark |
| `pepicons-pop` | Pepicons Pop! | 1,275 | CC-BY-4.0 (credit) | mixed | solid | bookmark, moon, pen, hash |
| `pepicons-print` | Pepicons Print | 1,275 | CC-BY-4.0 (credit) | mixed | solid | bookmark, moon, pen, hash |
| `pepicons-pencil` | Pepicons Pencil | 1,275 | CC-BY-4.0 (credit) | mixed | solid | bookmark, moon, pen, hash |
| `f7` | Framework7 Icons | 1,253 | MIT | 28 | solid | hourglass-bottomhalf-fill, pencil-outline, rosette, placemark-fill |
| `teenyicons` | Teenyicons | 1,200 | MIT | 15 | precise | face-id-solid, user-outline, page-break-outline, hexagon-outline |
| `dinkie-icons` | Dinkie Icons | 1,198 | MIT | mixed | solid | lock-small-filled, u1faab-small, battery-small, monospaced |
| `clarity` | Clarity | 1,103 | MIT | 36 | precise | help-outline-badged, heart-broken-solid, shield-outline-alerted, bookmark-solid |
| `streamline-freehand` | Freehand free icons | 1,000 | CC-BY-4.0 (credit) | 24 | solid | terminal, cursor-speed-1, lock-cancel-slash, data-transfer-vertical |
| `qlementine-icons` | Qlementine Icons | 905 | MIT | mixed | solid | windows-16, check-tick-small-16, speaker-0-16, play-16 |
| `glyphs-poly` | Glyphs Poly | 863 | MIT | mixed | multicolor, stroke | mouse-2, object-select, comment-1, asterisk |
| `picon` | Pico-icon | 824 | OFL-1.1 | mixed | precise | bookmark, rewind, folder, thunderbolt |
| `octicon` | Octicons | 780 | MIT | mixed | solid | alert-24, bell-slash-24, hourglass-24, skip-fill-16 |
| `memory` | Memory Icons | 651 | Apache-2.0 | 22 | precise | chart-bar, application, message, card-text |
| `nrk` | NRK Core Icons | 637 | CC-BY-4.0 (credit) | mixed | solid | lyn, edit, mening, media-airplay |
| `sidekickicons` | SidekickIcons | 500 | MIT | mixed | solid | crown, blockquote, compass, triangle-16-solid |
| `oui` | OpenSearch UI | 437 | Apache-2.0 | mixed | solid | word-wrap-disabled, annotation, token-rank-feature, shard |
| `system-uicons` | System UIcons | 430 | Unlicense | 21 | precise | bell, message-writing, write, check |
| `ooui` | OOUI | 421 | MIT | 20 | precise | search, share, restore, menu |
| `pajamas` | Gitlab SVGs | 410 | MIT | mixed | solid | preferences, expire, merge, trend-up |
| `radix-icons` | Radix Icons | 332 | MIT | 15 | precise | width, checkbox, code, border-width |
| `zondicons` | Zondicons | 297 | MIT | 20 | precise | copy, hand-stop, mouse, arrow-thick-down |
| `fa7-regular` | Font Awesome Regular | 272 | CC-BY-4.0 (credit) | 32 | precise | message, clock, folder, face-surprise |
| `uiw` | uiw icons | 214 | MIT | 20 | solid | cut, like-o, download, caret-down |
| `codex` | CodeX Icons | 156 | MIT | mixed | stroke | align-left, table-with-headings, heading, delimiter |
| `ei` | Evil Icons | 70 | MIT | 25 | precise | paperclip, like, arrow-right, navicon |

### Material

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `material-symbols-light` | Material Symbols Light | 15,842 | Apache-2.0 | 24 | precise | downloading, privacy-tip, filter-drama-outline, assignment-ind |
| `material-symbols` | Material Symbols | 15,777 | Apache-2.0 | 24 | solid | downloading, privacy-tip, filter-drama-outline, assignment-ind |
| `ic` | Google Material Icons | 10,955 | Apache-2.0 | 24 | solid | baseline-notifications-active, outline-person-outline, twotone-videocam-off, sharp-flash-on |
| `mdi` | Material Design Icons | 7,447 | Apache-2.0 | 24 | precise | account-check, bell-alert-outline, calendar-edit, skip-previous |
| `line-md` | Material Line Icons | 1,218 | MIT | 24 | stroke, precise, animated | loading-twotone-loop, beer-alt-twotone-loop, image-twotone, account |
| `mdi-light` | Material Design Light | 284 | OFL-1.1 | 24 | precise | cart, bell, login, skip-previous |

### UI Multicolor

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `icon-park` | IconPark | 2,658 | Apache-2.0 | 24 | multicolor, stroke, precise | add-one, english-mustache, basketball-clothes, sort |
| `streamline-color` | Streamline color | 2,000 | CC-BY-4.0 (credit) | 28 | multicolor | graph, pie-chart-flat, filter-2, asterisk-1 |
| `streamline-plump-color` | Plump color icons | 1,000 | CC-BY-4.0 (credit) | 24 | multicolor, stroke | tune-adjust-volume, pacman-flat, web, sad-face |
| `streamline-freehand-color` | Freehand color icons | 1,000 | CC-BY-4.0 (credit) | 24 | multicolor | discount-percent-thin, cursor-speed-1, data-transfer-diagonal, terminal |
| `withicons-suite` | with icons Suite | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-skeuo` | with icons Skeuo | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-sticker` | with icons Sticker | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-pastel` | with icons Pastel | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-plush` | with icons Plush | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-coquette` | with icons Coquette | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-anime` | with icons Anime | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-gothic` | with icons Gothic | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-bauhaus` | with icons Bauhaus | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-glass` | with icons Glass | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-kawaii` | with icons Kawaii | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-luxe` | with icons Luxe | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-retro` | with icons Retro | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-bento` | with icons Bento | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-brutal` | with icons Brutal | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-chrome` | with icons Chrome | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-clay` | with icons Clay | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-liquid` | with icons Liquid | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `streamline-flex-color` | Flex color icons | 1,000 | CC-BY-4.0 (credit) | 28 | multicolor | fahrenheit, tablet-capsule-flat, shuffle, music-equalizer |
| `streamline-sharp-color` | Sharp color icons | 1,000 | CC-BY-4.0 (credit) | 24 | multicolor, stroke | file-bookmark-flat, double-bookmark-flat, battery-medium-3-flat, bluetooth |
| `streamline-ultimate-color` | Ultimate color icons | 998 | CC-BY-4.0 (credit) | 24 | multicolor | touch-up, like, download-bottom, power-button |
| `fluent-color` | Fluent UI System Color Icons | 890 | MIT | mixed | multicolor, precise | mic-20, alert-32, wrench-24, shifts-32 |
| `streamline-kameleon-color` | Kameleon color icons | 600 | CC-BY-4.0 (credit) | 24 | multicolor | pointer, filter-duo, text-file, oven-glove-duo |
| `marketeq` | Marketeq | 590 | MIT | 25 | multicolor, stroke | mute, desk-6, fishing-hook, delta |
| `streamline-cyber-color` | Cyber color icons | 500 | CC-BY-4.0 (credit) | 24 | multicolor, precise | shopping-basket-3, command-2, music-note-1, loop-diamond |
| `streamline-stickies-color` | Stickies color icons | 200 | CC-BY-4.0 (credit) | mixed | multicolor | mail, love, validation-1, help |

### High Detail

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `arcticons` | Arcticons | 15,322 | CC-BY-SA-4.0 ⚠ | 48 | precise | instagram, color-capture |
| `healthicons` | Health Icons | 2,128 | MIT | 24 | precise | cold-chain, emergency-post |
| `streamline-memes` | Memes | 84 | CC-BY-4.0 (credit) | mixed | solid | angry-face, pop-cat |

### High Detail Multicolor

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `withicons-soft3d` | with icons Soft 3D | 1,000 | MIT | 24 | multicolor, stroke | home, search |
| `meteocons` | Meteocons | 447 | MIT | 32 | multicolor, stroke, animated | sunrise-fill, windsock |
| `iconito` | Iconito Food | 120 | MIT | mixed | multicolor | ice-cream, banana |

### Emoji

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `openmoji` | OpenMoji | 4,546 | CC-BY-SA-4.0 ⚠ | 36 | multicolor, stroke, precise | bicycle, bow-and-arrow, full-moon-face, plus |
| `twemoji` | Twitter Emoji | 3,988 | CC-BY-4.0 (credit) | 36 | multicolor, precise | anguished-face, duck, bell, spoon |
| `noto` | Noto Emoji | 3,729 | Apache-2.0 | 16 | multicolor, precise | beaming-face-with-smiling-eyes, computer-mouse, chart-increasing, dove |
| `fluent-emoji-flat` | Fluent Emoji Flat | 3,145 | MIT | 32 | multicolor, precise | avocado, ticket, straight-ruler, diamond-suit |
| `noto-v1` | Noto Emoji (v1) | 2,162 | Apache-2.0 | 16 | multicolor, precise | face-with-open-mouth, no-entry, scissors, card-index-dividers |
| `emojione` | Emoji One (Colored) | 1,834 | CC-BY-4.0 (credit) | 32 | multicolor, precise | anxious-face-with-sweat, cloud-with-snow, studio-microphone, antenna-bars |
| `fluent-emoji-high-contrast` | Fluent Emoji High Contrast | 1,595 | MIT | 32 | precise | avocado, ticket, straight-ruler, diamond-suit |
| `emojione-monotone` | Emoji One (Monotone) | 1,403 | CC-BY-4.0 (credit) | 32 | precise | face-with-tongue, envelope, frog-face, star |
| `emojione-v1` | Emoji One (v1) | 1,262 | CC-BY-SA-4.0 ⚠ | 32 | multicolor | face-savoring-food, panda-face, artist-palette, lightning-mood |
| `fxemoji` | Firefox OS Emoji | 1,034 | Apache-2.0 | 32 | multicolor | foxweary, loveletter, openlock, blackdiamondsuit |
| `streamline-emojis` | Streamline Emojis | 787 | CC-BY-4.0 (credit) | 24 | multicolor | crescent-moon, fire, kissing-face-with-smiling-eyes, paperclip |

### Flags

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `flag` | Flag Icons | 542 | MIT | mixed | multicolor, stroke | fr-1x1, bg-1x1 |
| `circle-flags` | Circle Flags | 444 | MIT | 32 | multicolor | klingon, de |
| `tabler-flags` | Tabler Flags | 297 | MIT | mixed | multicolor | aland-islands, japan |
| `flagpack` | Flagpack | 254 | MIT | 24 | multicolor | ci, th |
| `cif` | CoreUI Flags | 199 | CC0-1.0 | mixed | multicolor | ee, ca |

### Logos

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `selfhst` | selfh.st/icons | 7,332 | CC-BY-4.0 (credit) | mixed | multicolor | salt, adobe, aviato, usertour |
| `thesvg-color` | theSVG Color | 5,204 | MIT | mixed | multicolor | verizon, mitsubishi, peertube, cratedb |
| `token-branded` | Web3 Icons Branded | 4,085 | MIT | 24 | multicolor | bit, dog, eth, mtd |
| `thesvg` | theSVG | 3,805 | MIT | mixed | solid | mitsubishi, tencent, vuedotjs, kotlin |
| `simple-icons` | Simple Icons | 3,467 | CC0-1.0 | 24 | solid | wise, framer, vuetify, unsplash |
| `logos` | SVG Logos | 2,064 | CC0-1.0 | mixed | multicolor | npm-icon, uikit, patreon, serverless |
| `cbi` | Custom Brand Icons | 1,790 | CC-BY-NC-SA-4.0 ⛔ | mixed | precise | mitsubishi, espn, rooms-computer, netapp |
| `token` | Web3 Icons | 1,788 | MIT | 24 | solid | bit, dog, eth, mtd |
| `streamline-logos` | Logos free icons | 1,362 | CC-BY-4.0 (credit) | 24 | solid | microsoft-windows-logo-2, unspash-logo-solid, patreon-logo, macos-osx-logo-solid |
| `cib` | CoreUI Brands | 830 | CC0-1.0 | 32 | solid | cc-amazon-pay, hotjar, open-id, unsplash |
| `fa7-brands` | Font Awesome Brands | 608 | CC-BY-4.0 (credit) | 32 | solid | strava, css3, y-combinator, unsplash |
| `cryptocurrency` | Cryptocurrency Icons | 483 | CC0-1.0 | 32 | solid | btc, ltc, eth, storm |
| `cryptocurrency-color` | Cryptocurrency Color Icons | 483 | CC0-1.0 | 32 | multicolor | btc, ltc, eth, storm |
| `bxl` | Boxicons Brands | 295 | MIT | 24 | precise | patreon, adobe, vuejs, unsplash |
| `entypo-social` | Entypo+ Social | 76 | CC-BY-SA-4.0 ⚠ | 20 | solid | linkedin-with-circle, twitter, youtube, google-drive |
| `nonicons` | Nonicons | 69 | MIT | 16 | solid | kotlin-16, vue-16, npm-16, next-16 |
| `brandico` | Brandico | 45 | CC-BY-SA-3.0 ⚠ | mixed | solid | vimeo, twitter-bird, yandex, bandcamp |

### Programming

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `vscode-icons` | VSCode Icons | 1,719 | MIT | 32 | multicolor | file-type-actionscript2, file-type-json, file-type-manifest, default-file |
| `devicon` | Devicon | 1,111 | MIT | 32 | multicolor | windows8, tensorflow, logstash, stackblitz |
| `file-icons` | File Icons | 930 | ISC | 16 | solid | adobe, chartjs, dom, yaml |
| `material-icon-theme` | Material Icon Theme | 910 | MIT | mixed | multicolor | zip, email, folder-upload, stackblitz |
| `devicon-plain` | Devicon Plain | 805 | MIT | 32 | solid | kotlin, bulma, logstash, flutter |
| `codicon` | Codicons | 657 | CC-BY-4.0 (credit) | mixed | precise | account, bell-dot, new-file, split-vertical |
| `catppuccin` | Catppuccin Icons | 656 | MIT | 16 | multicolor | folder, nuxt, vscode, amber |
| `skill-icons` | Skill Icons | 400 | MIT | 24 | multicolor | markdown-light, vuejs-dark, html, fastapi |
| `gcp` | Google Cloud Icons | 214 | Apache-2.0 | mixed | multicolor | filestore, trace, firestore, connectivity-test |
| `unjs` | UnJS Logos | 63 | Apache-2.0 | 32 | multicolor | nitro, jiti, unstorage, h3 |
| `k8s` | Kubernetes Icons | 38 | Apache-2.0 | mixed | multicolor, precise | deployment, pod, namespace |

### Location

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `pinhead` | Pinhead Map Icons | 2,832 | CC0-1.0 | 15 | precise | a-frame-tent, bird, boat-on-trailer, floor-lamp |
| `roentgen` | Röntgen | 574 | CC-BY-4.0 (credit) | 16 | precise | apartments-3-story, binoculars, car, golf-club-and-ball |
| `temaki` | Temaki | 557 | CC0-1.0 | mixed | precise | milestone, elevator, storage, obelisk |
| `gis` | Font-GIS | 367 | CC-BY-4.0 (credit) | mixed | solid | layer-o, poi-o, bbox, flag-start |
| `maki` | Maki | 215 | CC0-1.0 | 15 | precise | entrance-alt1, clothing-store, grocery, roadblock |
| `osmic` | OSM Icons | 169 | CC0-1.0 | mixed | solid | post-office-14, elevator-14, pub-14, saddle-14 |
| `map` | Map Icons | 167 | OFL-1.1 | 25 | precise | restaurant, real-estate-agency, wheelchair, storage |
| `geo` | GeoGlyphs | 30 | MIT | mixed | solid | turf-center, turf-erased, turf-point-on-line, turf-destination |

### Thematic

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `game-icons` | Game Icons | 4,133 | CC-BY-3.0 (credit) | mixed | solid | diamond-trophy, thrown-spear, rank-3, stairs |
| `wi` | Weather Icons | 219 | OFL-1.1 | 30 | solid | day-hail, barometer, day-windy, moon-waning-crescent-2 |
| `academicons` | Academicons | 158 | OFL-1.1 | 32 | solid | conversation, crossref-square, stackoverflow, acclaim |
| `fad` | FontAudio | 155 | CC-BY-4.0 (credit) | 16 | solid | shuffle, headphones, rew, cutter |
| `medical-icon` | Medical Icons | 144 | MIT | mixed | solid | i-care-staff-area, i-nursery, immunizations, i-chapel |
| `covid` | Covid Icons | 142 | CC-BY-4.0 (credit) | 24 | stroke | social-distancing-correct-2, personal-hygiene-clean-toothpaste, vaccine-protection-medicine-pill, social-distancing-not-allowed-space-man |
| `ginetex` | Ginetex Care Symbols | 50 | MIT | 24 | precise | washing, bleaching, line-drying, do-not-bleach |

### Holiday / Seasonal

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `withicons-halloween` | with icons Halloween | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-christmas` | with icons Christmas | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-lunar` | with icons Cunar | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-rangoli` | with icons Rangoli | 1,000 | MIT | 24 | multicolor | home, search, settings, check |
| `withicons-utsav` | with icons Utsav | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |
| `withicons-valentine` | with icons Valentine | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |

### Apps

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `withicons-dock` | with icons Dock | 1,000 | MIT | 24 | multicolor, stroke | home, search, settings, check |

### Archive / Unmaintained

| Prefix | Name | Icons | License | Grid | Look | Samples |
| --- | --- | ---: | --- | --- | --- | --- |
| `fluent-mdl2` | Fluent UI MDL2 | 1,735 | MIT | 32 | precise | flow, home, switch, caret-solid-16 |
| `la` | Line Awesome | 1,544 | Apache-2.0 | mixed | precise | archive-solid, female-solid, check-circle, bars |
| `fa6-solid` | Font Awesome 6 Solid | 1,402 | CC-BY-4.0 (credit) | 32 | precise | location-pin, gem, folder, mound |
| `fa-solid` | Font Awesome 5 Solid | 1,001 | CC-BY-4.0 (credit) | 32 | solid | search-plus, paste, comment-dots, bookmark |
| `fa` | Font Awesome 4 | 678 | OFL-1.1 | mixed | solid | wrench, bell-o, user-o, area-chart |
| `vaadin` | Vaadin Icons | 636 | Apache-2.0 | 32 | precise | area-select, file-picture, plus-circle-o, angle-up |
| `grommet-icons` | Grommet Icons | 636 | Apache-2.0 | 24 | stroke, precise | user-expert, action, home, more-vertical |
| `fontisto` | Fontisto | 615 | MIT | 24 | precise | prescription, heartbeat-alt, rain, navigate |
| `fa6-brands` | Font Awesome 6 Brands | 495 | CC-BY-4.0 (credit) | 32 | solid | strava, css3, y-combinator, unsplash |
| `icomoon-free` | IcoMoon Free | 491 | GPL-3.0-or-later ⚠ | 16 | precise | bubbles3, forward, volume-medium, play3 |
| `eva` | Eva Icons | 490 | MIT | 24 | precise | droplet-off-outline, flash-fill, printer-outline, layout-fill |
| `fa-brands` | Font Awesome 5 Brands | 457 | CC-BY-4.0 (credit) | 32 | solid | amazon, cc-visa, vuejs, chrome |
| `ci` | coolicons v4 | 442 | CC-BY-4.0 (credit) | 24 | stroke, precise | bulb, house-01, compass |
| `dashicons` | Dashicons | 342 | GPL-2.0-or-later ⚠ | 20 | precise | shortcode, businessperson, editor-expand, sort |
| `flat-color-icons` | Flat Color Icons | 329 | MIT | 48 | multicolor, precise | edit-image, donate, planner, expand |
| `entypo` | Entypo+ | 321 | CC-BY-SA-4.0 ⚠ | 20 | precise | bell, image, erase, select-arrows |
| `subway` | Subway Icon Set | 306 | CC-BY-4.0 (credit) | 16 | solid | call-2, power-batton, admin, backward |
| `el` | Elusive Icons | 304 | OFL-1.1 | mixed | solid | headphones, cog, user, play |
| `foundation` | Foundation | 283 | MIT | mixed | solid | graph-trend, indent-more, lock, contrast |
| `raphael` | Raphael | 266 | MIT | 32 | solid | home, cloud, parent, inbox |
| `icons8` | Icons8 Windows 10 Icons | 234 | MIT | mixed | precise | checked, create-new, group, columns |
| `heroicons-outline` | HeroIcons v1 Outline | 230 | MIT | 24 | stroke, precise | color-swatch, library, receipt-refund, bookmark |
| `heroicons-solid` | HeroIcons v1 Solid | 230 | MIT | 20 | precise | color-swatch, library, receipt-refund, bookmark |
| `oi` | Open Iconic | 223 | MIT | 8 | precise | bug, bullhorn, chat, media-play |
| `wpf` | Icons8 Windows 8 Icons | 200 | MIT | 26 | solid | check-file, add-image, geo-fence, clapperboard |
| `simple-line-icons` | Simple line icons | 189 | MIT | 32 | precise | bubbles, camrecorder, cloud-upload, folder |
| `fa6-regular` | Font Awesome 6 Regular | 163 | CC-BY-4.0 (credit) | 32 | precise | message, clock, folder, face-surprise |
| `fa-regular` | Font Awesome 5 Regular | 151 | CC-BY-4.0 (credit) | 32 | solid | bell, comment, hand-point-left, bookmark |
| `iwwa` | Innowatio Font | 105 | Apache-2.0 | mixed | precise | tag, settings, connection-o, flag |
| `et` | Elegant | 100 | GPL-3.0-or-later ⚠ | 32 | precise | profile-female, ribbon, layers, tablet |
| `gala` | Gala Icons | 51 | GPL-3.0 ⚠ | 32 | stroke, precise | brochure, remove, chart, issue |
