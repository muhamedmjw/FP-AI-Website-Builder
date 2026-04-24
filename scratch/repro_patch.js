
const html = `
<footer>
  <div class="socials">
    <a href="#" class="instagram"><i class="fa fa-instagram"></i></a>
    <a href="#" class="facebook"><i class="fa fa-facebook"></i></a>
    <a href="#" class="twitter"><i class="fa fa-twitter"></i></a>
  </div>
  <p>© 2024 My Business</p>
</footer>
`;

const patches = [
  {
    search: 'href="#"',
    replace: 'href="https://facebook.com/avamediatv"'
  }
];

function applySinglePatch(html, search, replace) {
  const exactIndex = html.indexOf(search);
  if (exactIndex !== -1) {
    return (
      html.slice(0, exactIndex) +
      replace +
      html.slice(exactIndex + search.length)
    );
  }
  return null;
}

function applyEditPatches(originalHtml, patches) {
  let html = originalHtml;
  let appliedCount = 0;
  for (const patch of patches) {
    const result = applySinglePatch(html, patch.search, patch.replace);
    if (result !== null) {
      html = result;
      appliedCount++;
    }
  }
  return { html, appliedCount };
}

const result = applyEditPatches(html, patches);
console.log("Applied Count:", result.appliedCount);
console.log("Result HTML:", result.html);
