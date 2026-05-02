const fs = require('fs');
let c = fs.readFileSync('src/index.css', 'utf-8');
const searchString = 'color: #3fb950;';
let i = c.indexOf(searchString);

if (i > -1) {
  let n = c.substring(0, i + searchString.length) + '\n}\n\n' + `/* Fetching Loader */
.loader {
  height: 100%;
  width: 100%;
  aspect-ratio: 1;
  padding: 12.5%;
  border-radius: 25%;
  box-sizing: border-box;
  position: relative;
  mask: conic-gradient(#000 0 0) content-box exclude,conic-gradient(#000 0 0);
  -webkit-mask: conic-gradient(#000 0 0) content-box exclude,conic-gradient(#000 0 0);
  filter: blur(2px);
}
.loader:before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-conic-gradient(#0000 0 5%, currentColor, #0000 20% 50%);
  animation: l3 1.5s linear infinite;
  border-radius: inherit;
}
@keyframes l3 {
  to { transform: rotate(1turn); }
}
`;
  fs.writeFileSync('src/index.css', n, 'utf-8');
  console.log('Fixed syntax error!');
} else {
  console.log('Search string not found!');
}
