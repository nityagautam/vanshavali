export function exportJSON(familyData) {
  const blob = new Blob([JSON.stringify(familyData, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: 'family.json' }).click();
  URL.revokeObjectURL(url);
}
