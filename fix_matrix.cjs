const fs = require('fs');
let c = fs.readFileSync('src/index.css', 'utf-8');
const searchString = '/* Fetching Loader */';
let i = c.indexOf(searchString);

if (i > -1) {
  let n = c.substring(0, i) + `/* Matrix Loader */
.ai-matrix-loader-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-matrix-loader {
  width: 100%;
  height: 100%;
  position: relative;
  perspective: 400px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}
.ai-matrix-loader .digit {
  color: currentColor;
  font-family: 'JetBrains Mono', monospace;
  font-size: min(100%, 14px);
  text-align: center;
  text-shadow: 0 0 5px currentColor;
  animation: matrix-fall 2s infinite, matrix-flicker 0.5s infinite;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-matrix-loader .digit:nth-child(1) { animation-delay: 0.1s; }
.ai-matrix-loader .digit:nth-child(2) { animation-delay: 0.3s; }
.ai-matrix-loader .digit:nth-child(3) { animation-delay: 0.5s; }
.ai-matrix-loader .digit:nth-child(4) { animation-delay: 0.7s; }
.ai-matrix-loader .digit:nth-child(5) { animation-delay: 0.9s; }
.ai-matrix-loader .digit:nth-child(6) { animation-delay: 1.1s; }
.ai-matrix-loader .digit:nth-child(7) { animation-delay: 1.3s; }
.ai-matrix-loader .digit:nth-child(8) { animation-delay: 1.5s; }

.ai-matrix-loader .glow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle, currentColor 0%, transparent 70%);
  opacity: 0.1;
  animation: matrix-pulse 2s infinite;
}

@keyframes matrix-fall {
  0% { transform: translateY(-50%) rotateX(90deg); opacity: 0; }
  20%, 80% { transform: translateY(0) rotateX(0deg); opacity: 0.8; }
  100% { transform: translateY(50%) rotateX(-90deg); opacity: 0; }
}
@keyframes matrix-flicker {
  0%, 19%, 21%, 100% { opacity: 0.8; }
  20% { opacity: 0.2; }
}
@keyframes matrix-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
`;
  fs.writeFileSync('src/index.css', n, 'utf-8');
  console.log('Fixed matrix css!');
} else {
  console.log('search string missing');
}
