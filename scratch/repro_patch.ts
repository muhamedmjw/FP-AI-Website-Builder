
import { applyEditPatches } from "./src/server/services/html-patch";

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

const result = applyEditPatches(html, patches);
console.log("Applied Count:", result.appliedCount);
console.log("Result HTML:", result.html);
