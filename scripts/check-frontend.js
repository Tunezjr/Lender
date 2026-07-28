const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..', 'frontend');
const requiredFiles = ['index.html', 'app.js', 'styles.css', 'prototype/data.json'];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(frontendRoot, file)));

if (missing.length > 0) {
  console.error(`Missing frontend file(s): ${missing.join(', ')}`);
  process.exitCode = 1;
  return;
}

const indexHtml = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(frontendRoot, 'app.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'prototype/data.json'), 'utf8'));

const requiredMarkup = ['id="map"', 'id="stats"', 'id="events"', 'id="attributions"'];
const missingMarkup = requiredMarkup.filter((snippet) => !indexHtml.includes(snippet));

if (missingMarkup.length > 0) {
  console.error(`Frontend markup is missing required target(s): ${missingMarkup.join(', ')}`);
  process.exitCode = 1;
  return;
}

if (!appJs.includes("fetch('./prototype/data.json')")) {
  console.error('Frontend app does not load the fixture data used to render the dashboard.');
  process.exitCode = 1;
  return;
}

if (!Array.isArray(data.events) || data.events.length === 0 || !data.api?.data?.nodes?.length) {
  console.error('Prototype data does not include events and graph nodes for the dashboard.');
  process.exitCode = 1;
  return;
}

console.log(`Frontend check passed: ${requiredFiles.length} files present, ${data.events.length} events, ${data.api.data.nodes.length} nodes.`);
