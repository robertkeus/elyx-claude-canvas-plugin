// Packs a board as a static page a Claude artifact can host: the page with its data
// inline, and one PNG per frame beside it. Claude publishes the folder; the canvas
// only prepares it, because only Claude can reach the artifact tools.

// A frame's PNG stays under this many pixels, so a long page is still a sane file.
const MAX_PIXELS = 1.6e7

// Hashes claude.ai keeps for itself.
const RESERVED = /^(settings|sidebar|customize|upgrade|downloads|comment(-.*)?)$/

// An ASCII name per frame, unique on the board: it names the PNG and the page's #hash.
export const frameIds = names => {
  const taken = new Set()
  return names.map(name => {
    const plain = String(name).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'frame'
    const base = RESERVED.test(plain) ? `${plain}-frame` : plain
    let id = base
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
    taken.add(id)
    return id
  })
}

// Twice the design size, or less when that would pass the pixel budget.
export const shareScale = ({ w, h }) => Math.max(0.25, Math.floor(Math.min(2, Math.sqrt(MAX_PIXELS / (w * h))) * 100) / 100)

const escapeHtml = text => String(text).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char])

// `<` is escaped so no value can close the data's script element.
export const sharePage = (template, data) =>
  template
    .replace('__TITLE__', () => escapeHtml(data.title))
    .replace('__DATA__', () => JSON.stringify(data).replace(/</g, '\\u003c'))

// What Claude is asked to do with the folder. A board shared before keeps its page.
export const shareRequest = ({ folder, files, title, slug }) => {
  const list = files.map(file => `\`${file}\``).join(', ')
  const publish = slug
    ? `It was shared before as the artifact ${slug}: republish to it with publish_files (slug, base_version and shared_live from get_artifact, mode "replace"), so its link stays the same. If that artifact is gone, publish a new one instead.`
    : `Publish it as a new artifact with publish_files: title "${title}", icon "design".`
  return [
    `Share an Elyx board as a Claude artifact. The canvas packed it in ${folder}: a viewer page and a PNG per frame.`,
    `${publish} Send exactly these files, each with \`as\` set to its path inside that folder: ${list}.`,
    `Then write {"slug": "<the artifact's slug>"} to ${folder}/artifact.json, so the next share updates the same page, and give the person the link.`,
    'Tell them the page holds the frames and tokens as they are now, and that sharing again updates it. If it is new, it is private: they share it from its page on claude.ai, with people, their organization, or anyone with the link.',
  ].join('\n')
}
