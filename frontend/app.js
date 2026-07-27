const coordinates = {
  "entity:monad-143:monad-bridge": [120, 210],
  "entity:monad-143:wallet-a": [320, 310],
  "entity:monad-143:ambient-mon-usdc-pool": [540, 210],
  "entity:monad-143:yield-vault": [760, 310],
  "entity:monad-143:rewards-distributor": [540, 450],
  "asset:monad-143:mon": [825, 120],
  "asset:monad-143:usdc": [925, 220],
};

const data = await fetch('./prototype/data.json').then((response) => response.json());
const svg = document.querySelector('#map');
const nodeById = new Map(data.api.data.nodes.map((node) => [node.id, node]));
const eventById = new Map(data.events.map((event) => [event.id, event]));
const assetSymbol = (assetId) => nodeById.get(assetId)?.label ?? assetId.split(':').at(-1).toUpperCase();
const entityLabel = (entityId) => nodeById.get(entityId)?.label ?? entityId;

const totalsByAsset = data.events.reduce((totals, event) => {
  const symbol = assetSymbol(event.assetId);
  totals.set(symbol, (totals.get(symbol) ?? 0) + Number(event.amountDecimal));
  return totals;
}, new Map());

const totalVolume = [...totalsByAsset.values()].reduce((sum, value) => sum + value, 0);
document.querySelector('#snapshot').textContent = `${data.snapshotId} · generated ${new Date(data.generatedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;
document.querySelector('#health-copy').textContent = `${data.analytics.eventCount} canonical events reconciled across ${data.viewModel.nodeCount} liquidity nodes.`;
document.querySelector('#stats').innerHTML = [
  ['Total flow', totalVolume.toLocaleString(), 'Normalized units tracked for lender liquidity review'],
  ['Nodes', data.viewModel.nodeCount, 'Assets, protocols, wallets, vaults, and pools'],
  ['Flow edges', data.viewModel.edgeCount, 'Directed routes affecting collateral and depth'],
  ['Animated pipes', data.viewModel.animatedEdgeIds.length, 'Routes with observable movement'],
].map(([label, value, helper]) => `<article class="stat"><strong>${value}</strong><span>${label}</span><small>${helper}</small></article>`).join('');

const edgeElements = [];
for (const edge of data.api.data.edges) {
  const event = eventById.get(edge.eventId);
  const [x1, y1] = coordinates[edge.fromNodeId] ?? [100, 100];
  const [x2, y2] = coordinates[edge.toNodeId] ?? [900, 420];
  const pathId = `path-${edge.id.replaceAll(':', '-')}`;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('id', pathId);
  path.setAttribute('class', 'pipe');
  path.dataset.asset = assetSymbol(event.assetId);
  path.setAttribute('d', `M ${x1} ${y1} C ${(x1+x2)/2} ${y1-120}, ${(x1+x2)/2} ${y2+120}, ${x2} ${y2}`);
  svg.append(path);

  const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  packet.setAttribute('class', 'packet');
  packet.dataset.asset = assetSymbol(event.assetId);
  packet.setAttribute('r', String(Math.max(7, Math.min(18, edge.weight / 12))));
  packet.innerHTML = `<animateMotion dur="${Math.max(3, 8 - edge.weight / 30)}s" repeatCount="indefinite"><mpath href="#${pathId}" /></animateMotion>`;
  svg.append(packet);
  edgeElements.push(path, packet);
}

for (const node of data.api.data.nodes) {
  const [x, y] = coordinates[node.id] ?? [80 + Math.random() * 800, 120 + Math.random() * 320];
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', `node ${node.kind}`);
  group.setAttribute('transform', `translate(${x} ${y})`);
  group.innerHTML = `<circle r="52"></circle><text y="-2">${node.label}</text><text class="kind" y="20">${node.kind}</text>`;
  svg.append(group);
}

function renderDetail(filter = 'all') {
  const filteredEvents = filter === 'all' ? data.events : data.events.filter((event) => assetSymbol(event.assetId) === filter);
  const filteredVolume = filteredEvents.reduce((sum, event) => sum + Number(event.amountDecimal), 0);
  const confidence = filteredEvents.length ? Math.round(filteredEvents.reduce((sum, event) => sum + event.confidence, 0) / filteredEvents.length * 100) : 0;
  document.querySelector('#route-title').textContent = filter === 'all' ? 'Entire book' : `${filter} exposure`;
  document.querySelector('#route-copy').textContent = filter === 'all'
    ? 'All canonical lender-relevant routes are visible, including bridge inflow, pool deposits, vault routing, and incentives.'
    : `${filter} routes are isolated so underwriting teams can review asset-specific liquidity and concentration.`;
  document.querySelector('#risk-fill').style.width = `${confidence}%`;
  document.querySelector('#route-metrics').innerHTML = [
    ['Events', filteredEvents.length],
    ['Volume', filteredVolume.toLocaleString()],
    ['Confidence', `${confidence}%`],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function applyFilter(filter) {
  document.querySelectorAll('.filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === filter));
  edgeElements.forEach((element) => element.classList.toggle('muted', filter !== 'all' && element.dataset.asset !== filter));
  renderDetail(filter);
}

document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
applyFilter('all');

document.querySelector('#events').innerHTML = data.events.map((event) => {
  return `<div class="event-row"><span><strong>${event.amountDecimal} ${assetSymbol(event.assetId)}</strong> flowed from ${entityLabel(event.fromEntityId)} to ${entityLabel(event.toEntityId)}</span><code>${event.transactionHash}</code></div>`;
}).join('');

document.querySelector('#attributions').innerHTML = data.attributions.map((row) => {
  const net = Number(row.netRaw) >= 0 ? 'positive' : 'negative';
  return `<div class="event-row"><span><strong>${entityLabel(row.entityId)}</strong><br><small>${assetSymbol(row.assetId)} net position is ${net}</small></span><code>${net}</code></div>`;
}).join('');
