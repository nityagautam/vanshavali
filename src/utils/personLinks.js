// About text can link to a member with `[label](person:<id>)`. Rendered as a
// link into the tree on the About page; stripped back to the label for print
// and other plain-text uses.
const LINK = /\[([^\]]+)\]\(person:([^)\s]+)\)/g;

export function parsePersonLinks(text = '') {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[1], personId: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export const stripPersonLinks = (text = '') => text.replace(LINK, '$1');
