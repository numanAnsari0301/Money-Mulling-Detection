 // Global state
 let analysisResults = null;
 let graphData = null;
 let simulation = null;

 // Demo data generator
 function generateDemoData() {
     const accounts = [];
     for (let i = 1; i <= 50; i++) {
         accounts.push(`ACC_${String(i).padStart(5, '0')}`);
     }

     const transactions = [];
     let txId = 1;

     // Generate legitimate transactions (random mesh)
     for (let i = 0; i < 80; i++) {
         const sender = accounts[Math.floor(Math.random() * accounts.length)];
         let receiver = accounts[Math.floor(Math.random() * accounts.length)];
         while (receiver === sender) receiver = accounts[Math.floor(Math.random() * accounts.length)];
         
         transactions.push({
             transaction_id: `TXN_${String(txId++).padStart(6, '0')}`,
             sender_id: sender,
             receiver_id: receiver,
             amount: parseFloat((Math.random() * 10000 + 100).toFixed(2)),
             timestamp: `2026-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`
         });
     }

     // Ring 1: Circular (A->B->C->A)
     const ring1 = ['ACC_00001', 'ACC_00002', 'ACC_00003'];
     const baseTime = new Date('2026-01-15T10:00:00');
     for (let i = 0; i < 3; i++) {
         transactions.push({
             transaction_id: `TXN_${String(txId++).padStart(6, '0')}`,
             sender_id: ring1[i],
             receiver_id: ring1[(i + 1) % 3],
             amount: 5000.00,
             timestamp: new Date(baseTime.getTime() + i * 3600000).toISOString().replace('T', ' ').substring(0, 19)
         });
     }

     // Ring 2: Smurfing (Fan-in then Fan-out)
     const smurfsIn = ['ACC_00010', 'ACC_00011', 'ACC_00012', 'ACC_00013', 'ACC_00014', 'ACC_00015', 'ACC_00016', 'ACC_00017', 'ACC_00018', 'ACC_00019', 'ACC_00020'];
     const aggregator = 'ACC_00021';
     const smurfsOut = ['ACC_00022', 'ACC_00023', 'ACC_00024', 'ACC_00025', 'ACC_00026', 'ACC_00027', 'ACC_00028', 'ACC_00029', 'ACC_00030', 'ACC_00031', 'ACC_00032'];
     
     // Fan in (within 24 hours)
     smurfsIn.forEach((acc, idx) => {
         transactions.push({
             transaction_id: `TXN_${String(txId++).padStart(6, '0')}`,
             sender_id: acc,
             receiver_id: aggregator,
             amount: 800.00,
             timestamp: `2026-01-20 ${String(9 + Math.floor(idx/2)).padStart(2, '0')}:${String((idx * 5) % 60).padStart(2, '0')}:00`
         });
     });
     
     // Fan out (within 24 hours)
     smurfsOut.forEach((acc, idx) => {
         transactions.push({
             transaction_id: `TXN_${String(txId++).padStart(6, '0')}`,
             sender_id: aggregator,
             receiver_id: acc,
             amount: 750.00,
             timestamp: `2026-01-20 ${String(14 + Math.floor(idx/2)).padStart(2, '0')}:${String((idx * 5) % 60).padStart(2, '0')}:00`
         });
     });

     // Ring 3: Shell company layering (3 hops, low activity intermediates)
     const shell1 = 'ACC_00040';
     const shell2 = 'ACC_00041';
     const shell3 = 'ACC_00042';
     const origin = 'ACC_00043';
     const destination = 'ACC_00044';
     
     transactions.push(
         { transaction_id: `TXN_${String(txId++).padStart(6, '0')}`, sender_id: origin, receiver_id: shell1, amount: 10000.00, timestamp: '2026-01-25 09:00:00' },
         { transaction_id: `TXN_${String(txId++).padStart(6, '0')}`, sender_id: shell1, receiver_id: shell2, amount: 9900.00, timestamp: '2026-01-25 10:00:00' },
         { transaction_id: `TXN_${String(txId++).padStart(6, '0')}`, sender_id: shell2, receiver_id: shell3, amount: 9800.00, timestamp: '2026-01-25 11:00:00' },
         { transaction_id: `TXN_${String(txId++).padStart(6, '0')}`, sender_id: shell3, receiver_id: destination, amount: 9700.00, timestamp: '2026-01-25 12:00:00' }
     );

     // Convert to CSV
     const headers = 'transaction_id,sender_id,receiver_id,amount,timestamp\n';
     const rows = transactions.map(t => `${t.transaction_id},${t.sender_id},${t.receiver_id},${t.amount},${t.timestamp}`).join('\n');
     return headers + rows;
 }

 function loadDemoData() {
     const csv = generateDemoData();
     const blob = new Blob([csv], { type: 'text/csv' });
     const file = new File([blob], 'demo_transactions.csv', { type: 'text/csv' });
     processFile(file);
 }

 function downloadTemplate() {
     const template = 'transaction_id,sender_id,receiver_id,amount,timestamp\nTXN_000001,ACC_00123,ACC_00456,1500.00,2026-01-15 14:30:00\nTXN_000002,ACC_00456,ACC_00789,1450.00,2026-01-15 15:45:00';
     const blob = new Blob([template], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'template.csv';
     a.click();
 }

 // File upload handling
 const dropZone = document.getElementById('drop-zone');
 const fileInput = document.getElementById('csv-input');

 dropZone.addEventListener('click', () => fileInput.click());
 
 dropZone.addEventListener('dragover', (e) => {
     e.preventDefault();
     dropZone.classList.add('dragover');
 });

 dropZone.addEventListener('dragleave', () => {
     dropZone.classList.remove('dragover');
 });

 dropZone.addEventListener('drop', (e) => {
     e.preventDefault();
     dropZone.classList.remove('dragover');
     const file = e.dataTransfer.files[0];
     if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
         processFile(file);
     } else {
         alert('Please upload a CSV file');
     }
 });

 fileInput.addEventListener('change', (e) => {
     if (e.target.files[0]) {
         processFile(e.target.files[0]);
     }
 });

 async function processFile(file) {
     const startTime = performance.now();
     
     // Show processing
     document.getElementById('upload-section').classList.add('hidden');
     document.getElementById('processing-section').classList.remove('hidden');
     
     const text = await file.text();
     const transactions = parseCSV(text);
     
     if (transactions.length === 0) {
         alert('No valid transactions found in CSV');
         resetAnalysis();
         return;
     }

     // Simulate processing steps
     await updateProgress(20, 'Parsing transaction graph...');
     await new Promise(r => setTimeout(r, 300));
     
     await updateProgress(40, 'Detecting circular patterns...');
     const cycles = detectCycles(transactions);
     
     await updateProgress(60, 'Analyzing smurfing patterns...');
     const smurfing = detectSmurfing(transactions);
     
     await updateProgress(80, 'Identifying shell networks...');
     const shells = detectShellNetworks(transactions);
     
     await updateProgress(90, 'Calculating risk scores...');
     const results = compileResults(transactions, cycles, smurfing, shells, startTime);
     
     await updateProgress(100, 'Complete');
     
     analysisResults = results;
     displayResults(results);
 }

 function updateProgress(percent, step) {
     return new Promise(resolve => {
         document.getElementById('processing-percent').textContent = percent + '%';
         document.getElementById('progress-bar').style.width = percent + '%';
         document.getElementById('processing-step').textContent = step;
         setTimeout(resolve, 100);
     });
 }

 function parseCSV(text) {
     const lines = text.trim().split('\n');
     const headers = lines[0].split(',').map(h => h.trim());
     const transactions = [];
     
     for (let i = 1; i < lines.length; i++) {
         const values = lines[i].split(',');
         if (values.length >= 5) {
             transactions.push({
                 transaction_id: values[0].trim(),
                 sender_id: values[1].trim(),
                 receiver_id: values[2].trim(),
                 amount: parseFloat(values[3]),
                 timestamp: values[4].trim()
             });
         }
     }
     return transactions;
 }

 // Graph Analysis Algorithms
 function buildGraph(transactions) {
     const nodes = new Set();
     const edges = [];
     const adjacency = {};
     const reverseAdj = {};
     
     transactions.forEach(tx => {
         nodes.add(tx.sender_id);
         nodes.add(tx.receiver_id);
         
         edges.push({
             source: tx.sender_id,
             target: tx.receiver_id,
             amount: tx.amount,
             timestamp: tx.timestamp,
             id: tx.transaction_id
         });
         
         if (!adjacency[tx.sender_id]) adjacency[tx.sender_id] = [];
         adjacency[tx.sender_id].push(tx.receiver_id);
         
         if (!reverseAdj[tx.receiver_id]) reverseAdj[tx.receiver_id] = [];
         reverseAdj[tx.receiver_id].push(tx.sender_id);
     });
     
     return { nodes: Array.from(nodes), edges, adjacency, reverseAdj };
 }

 function detectCycles(transactions) {
     const graph = buildGraph(transactions);
     const cycles = [];
     const visited = new Set();
     const recursionStack = new Set();
     const path = [];
     
     function dfs(node, startNode, depth) {
         if (depth > 5) return; // Limit cycle length to 5
         
         visited.add(node);
         recursionStack.add(node);
         path.push(node);
         
         if (graph.adjacency[node]) {
             for (const neighbor of graph.adjacency[node]) {
                 if (neighbor === startNode && path.length >= 3) {
                     // Found cycle
                     cycles.push([...path]);
                 } else if (!recursionStack.has(neighbor) && !visited.has(neighbor)) {
                     dfs(neighbor, startNode, depth + 1);
                 }
             }
         }
         
         path.pop();
         recursionStack.delete(node);
     }
     
     // Check cycles starting from each node (limit to length 3-5)
     graph.nodes.forEach(node => {
         visited.clear();
         recursionStack.clear();
         path.length = 0;
         dfs(node, node, 1);
     });
     
     // Remove duplicate cycles (rotations)
     const uniqueCycles = [];
     const seen = new Set();
     
     cycles.forEach(cycle => {
         const normalized = [...cycle].sort().join(',');
         if (!seen.has(normalized)) {
             seen.add(normalized);
             uniqueCycles.push(cycle);
         }
     });
     
     return uniqueCycles;
 }

 function detectSmurfing(transactions) {
     const graph = buildGraph(transactions);
     const patterns = { fanIn: [], fanOut: [] };
     
     // Group transactions by time windows (72 hours = 259200000 ms)
     const timeGroups = {};
     transactions.forEach(tx => {
         const date = new Date(tx.timestamp);
         const windowKey = Math.floor(date.getTime() / 259200000);
         if (!timeGroups[windowKey]) timeGroups[windowKey] = [];
         timeGroups[windowKey].push(tx);
     });
     
     Object.values(timeGroups).forEach(group => {
         const inCounts = {};
         const outCounts = {};
         
         group.forEach(tx => {
             if (!inCounts[tx.receiver_id]) inCounts[tx.receiver_id] = new Set();
             inCounts[tx.receiver_id].add(tx.sender_id);
             
             if (!outCounts[tx.sender_id]) outCounts[tx.sender_id] = new Set();
             outCounts[tx.sender_id].add(tx.receiver_id);
         });
         
         // Fan-in: 10+ senders to 1 receiver
         Object.entries(inCounts).forEach(([receiver, senders]) => {
             if (senders.size >= 10) {
                 patterns.fanIn.push({
                     aggregator: receiver,
                     senders: Array.from(senders),
                     count: senders.size
                 });
             }
         });
         
         // Fan-out: 1 sender to 10+ receivers
         Object.entries(outCounts).forEach(([sender, receivers]) => {
             if (receivers.size >= 10) {
                 patterns.fanOut.push({
                     distributor: sender,
                     receivers: Array.from(receivers),
                     count: receivers.size
                 });
             }
         });
     });
     
     return patterns;
 }

 function detectShellNetworks(transactions) {
     const graph = buildGraph(transactions);
     const shells = [];
     const nodeDegrees = {};
     
     // Calculate degrees
     graph.nodes.forEach(node => {
         const outDegree = graph.adjacency[node] ? graph.adjacency[node].length : 0;
         const inDegree = graph.reverseAdj[node] ? graph.reverseAdj[node].length : 0;
         nodeDegrees[node] = outDegree + inDegree;
     });
     
     // Find chains of 3+ hops where intermediates have degree 2-3
     const visited = new Set();
     
     function findChains(start, current, chain) {
         if (chain.length >= 4) { // 3 intermediates + destination
             const intermediates = chain.slice(1, -1);
             const allLowDegree = intermediates.every(n => nodeDegrees[n] >= 2 && nodeDegrees[n] <= 3);
             if (allLowDegree) {
                 shells.push([...chain]);
             }
             return;
         }
         
         if (!graph.adjacency[current]) return;
         
         for (const next of graph.adjacency[current]) {
             if (!chain.includes(next)) {
                 chain.push(next);
                 findChains(start, next, chain);
                 chain.pop();
             }
         }
     }
     
     graph.nodes.forEach(node => {
         if (graph.adjacency[node]) {
             findChains(node, node, [node]);
         }
     });
     
     return shells;
 }

 function compileResults(transactions, cycles, smurfing, shells, startTime) {
     const processingTime = ((performance.now() - startTime) / 1000).toFixed(1);
     const graph = buildGraph(transactions);
     
     const suspiciousAccounts = new Map();
     const fraudRings = [];
     let ringCounter = 1;
     
     // Process cycles
     cycles.forEach((cycle, idx) => {
         const ringId = `RING_${String(ringCounter++).padStart(3, '0')}`;
         const riskScore = Math.min(95 + Math.random() * 5, 100).toFixed(1);
         
         fraudRings.push({
             ring_id: ringId,
             member_accounts: cycle,
             pattern_type: 'cycle',
             risk_score: parseFloat(riskScore)
         });
         
         cycle.forEach(acc => {
             if (!suspiciousAccounts.has(acc)) {
                 suspiciousAccounts.set(acc, {
                     account_id: acc,
                     suspicion_score: 0,
                     detected_patterns: [],
                     ring_id: ringId
                 });
             }
             const entry = suspiciousAccounts.get(acc);
             entry.detected_patterns.push(`cycle_length_${cycle.length}`);
             entry.suspicion_score = Math.max(entry.suspicion_score, 85);
         });
     });
     
     // Process smurfing
     [...smurfing.fanIn, ...smurfing.fanOut].forEach(pattern => {
         const ringId = `RING_${String(ringCounter++).padStart(3, '0')}`;
         const isFanIn = pattern.aggregator !== undefined;
         const central = isFanIn ? pattern.aggregator : pattern.distributor;
         const members = isFanIn ? pattern.senders : pattern.receivers;
         const allMembers = [central, ...members];
         
         fraudRings.push({
             ring_id: ringId,
             member_accounts: allMembers,
             pattern_type: isFanIn ? 'fan_in' : 'fan_out',
             risk_score: parseFloat((80 + Math.random() * 15).toFixed(1))
         });
         
         allMembers.forEach(acc => {
             if (!suspiciousAccounts.has(acc)) {
                 suspiciousAccounts.set(acc, {
                     account_id: acc,
                     suspicion_score: 0,
                     detected_patterns: [],
                     ring_id: ringId
                 });
             }
             const entry = suspiciousAccounts.get(acc);
             entry.detected_patterns.push(isFanIn ? 'smurfing_aggregation' : 'smurfing_distribution');
             entry.suspicion_score = Math.max(entry.suspicion_score, 75);
         });
     });
     
     // Process shells
     shells.forEach((chain, idx) => {
         const ringId = `RING_${String(ringCounter++).padStart(3, '0')}`;
         
         fraudRings.push({
             ring_id: ringId,
             member_accounts: chain,
             pattern_type: 'layering_shell',
             risk_score: parseFloat((70 + Math.random() * 20).toFixed(1))
         });
         
         chain.forEach(acc => {
             if (!suspiciousAccounts.has(acc)) {
                 suspiciousAccounts.set(acc, {
                     account_id: acc,
                     suspicion_score: 0,
                     detected_patterns: [],
                     ring_id: ringId
                 });
             }
             const entry = suspiciousAccounts.get(acc);
             entry.detected_patterns.push('shell_intermediate');
             entry.suspicion_score = Math.max(entry.suspicion_score, 70);
         });
     });
     
     // Calculate additional metrics for scoring
     const accountStats = {};
     transactions.forEach(tx => {
         if (!accountStats[tx.sender_id]) {
             accountStats[tx.sender_id] = { out: 0, in: 0, volume: 0 };
         }
         if (!accountStats[tx.receiver_id]) {
             accountStats[tx.receiver_id] = { out: 0, in: 0, volume: 0 };
         }
         accountStats[tx.sender_id].out++;
         accountStats[tx.receiver_id].in++;
         accountStats[tx.sender_id].volume += tx.amount;
         accountStats[tx.receiver_id].volume += tx.amount;
     });
     
     // Adjust scores based on velocity and volume
     suspiciousAccounts.forEach((entry, acc) => {
         const stats = accountStats[acc] || { out: 0, in: 0, volume: 0 };
         const velocity = stats.out + stats.in;
         
         if (velocity > 20) {
             entry.detected_patterns.push('high_velocity');
             entry.suspicion_score = Math.min(entry.suspicion_score + 5, 100);
         }
         if (stats.volume > 50000) {
             entry.detected_patterns.push('high_volume');
             entry.suspicion_score = Math.min(entry.suspicion_score + 3, 100);
         }
         
         entry.suspicion_score = parseFloat(entry.suspicion_score.toFixed(1));
     });
     
     const suspiciousArray = Array.from(suspiciousAccounts.values())
         .sort((a, b) => b.suspicion_score - a.suspicion_score);
     
     return {
         suspicious_accounts: suspiciousArray,
         fraud_rings: fraudRings,
         summary: {
             total_accounts_analyzed: graph.nodes.length,
             suspicious_accounts_flagged: suspiciousArray.length,
             fraud_rings_detected: fraudRings.length,
             processing_time_seconds: parseFloat(processingTime)
         },
         graph: graph,
         transactions: transactions
     };
 }

 function displayResults(results) {
     document.getElementById('processing-section').classList.add('hidden');
     document.getElementById('results-section').classList.remove('hidden');
     
     // Update metrics
     document.getElementById('metric-accounts').textContent = results.summary.total_accounts_analyzed;
     document.getElementById('metric-suspicious').textContent = results.summary.suspicious_accounts_flagged;
     document.getElementById('metric-rings').textContent = results.summary.fraud_rings_detected;
     document.getElementById('metric-time').textContent = results.summary.processing_time_seconds + 's';
     
     // Render graph
     renderGraph(results);
     
     // Render tables
     renderRingsTable(results.fraud_rings);
     renderAccountsTable(results.suspicious_accounts);
 }

 function renderGraph(results) {
     const container = document.getElementById('graph-container');
     const width = container.clientWidth;
     const height = container.clientHeight;
     
     const svg = d3.select('#graph-svg')
         .append('svg')
         .attr('width', width)
         .attr('height', height)
         .attr('viewBox', [0, 0, width, height]);
     
     // Prepare nodes and links
     const suspiciousSet = new Set(results.suspicious_accounts.map(a => a.account_id));
     const ringMembers = new Set(results.fraud_rings.flatMap(r => r.member_accounts));
     
     const nodes = results.graph.nodes.map(id => ({
         id,
         isSuspicious: suspiciousSet.has(id),
         isRingMember: ringMembers.has(id),
         radius: suspiciousSet.has(id) ? 12 : (ringMembers.has(id) ? 10 : 6)
     }));
     
     const links = results.graph.edges.map(e => ({
         source: e.source,
         target: e.target,
         amount: e.amount
     }));
     
     // Force simulation
     simulation = d3.forceSimulation(nodes)
         .force('link', d3.forceLink(links).id(d => d.id).distance(100))
         .force('charge', d3.forceManyBody().strength(-300))
         .force('center', d3.forceCenter(width / 2, height / 2))
         .force('collision', d3.forceCollide().radius(d => d.radius + 5));
     
     // Draw links
     const link = svg.append('g')
         .selectAll('line')
         .data(links)
         .join('line')
         .attr('class', 'link')
         .attr('stroke', '#475569')
         .attr('stroke-width', 1.5)
         .attr('marker-end', 'url(#arrowhead)');
     
     // Define arrow marker
     svg.append('defs').append('marker')
         .attr('id', 'arrowhead')
         .attr('viewBox', '0 -5 10 10')
         .attr('refX', 20)
         .attr('refY', 0)
         .attr('markerWidth', 6)
         .attr('markerHeight', 6)
         .attr('orient', 'auto')
         .append('path')
         .attr('d', 'M0,-5L10,0L0,5')
         .attr('fill', '#475569');
     
     // Draw nodes
     const node = svg.append('g')
         .selectAll('g')
         .data(nodes)
         .join('g')
         .attr('class', d => `node ${d.isSuspicious ? 'suspicious-node' : ''}`)
         .call(d3.drag()
             .on('start', dragstarted)
             .on('drag', dragged)
             .on('end', dragended));
     
     // Node circles
     node.append('circle')
         .attr('r', d => d.radius)
         .attr('fill', d => {
             if (d.isSuspicious) return '#ef4444';
             if (d.isRingMember) return '#f97316';
             return '#64748b';
         })
         .attr('stroke', d => {
             if (d.isSuspicious) return '#fca5a5';
             if (d.isRingMember) return '#fdba74';
             return '#94a3b8';
         })
         .attr('stroke-width', 2);
     
     // Node labels (only for suspicious/ring members or high degree)
     node.append('text')
         .text(d => d.id)
         .attr('x', d => d.radius + 5)
         .attr('y', 4)
         .attr('font-size', '10px')
         .attr('fill', '#cbd5e1')
         .attr('class', 'mono')
         .style('opacity', d => (d.isSuspicious || d.isRingMember) ? 1 : 0.3);
     
     // Tooltip interaction
     const tooltip = document.getElementById('node-tooltip');
     
     node.on('mouseover', function(event, d) {
         const stats = calculateNodeStats(d.id, results.transactions);
         tooltip.innerHTML = `
             <div class="font-bold text-indigo-400 mb-1">${d.id}</div>
             <div class="text-slate-300">Out: ${stats.out} | In: ${stats.in}</div>
             <div class="text-slate-300">Volume: $${stats.volume.toLocaleString()}</div>
             ${d.isSuspicious ? '<div class="text-red-400 mt-1 font-bold">⚠ SUSPICIOUS</div>' : ''}
             ${d.isRingMember ? '<div class="text-orange-400 mt-1">Ring Member</div>' : ''}
         `;
         tooltip.classList.remove('hidden');
         tooltip.style.left = (event.pageX + 10) + 'px';
         tooltip.style.top = (event.pageY - 10) + 'px';
     })
     .on('mouseout', () => {
         tooltip.classList.add('hidden');
     });
     
     simulation.on('tick', () => {
         link
             .attr('x1', d => d.source.x)
             .attr('y1', d => d.source.y)
             .attr('x2', d => d.target.x)
             .attr('y2', d => d.target.y);
         
         node.attr('transform', d => `translate(${d.x},${d.y})`);
     });
     
     function dragstarted(event, d) {
         if (!event.active) simulation.alphaTarget(0.3).restart();
         d.fx = d.x;
         d.fy = d.y;
     }
     
     function dragged(event, d) {
         d.fx = event.x;
         d.fy = event.y;
     }
     
     function dragended(event, d) {
         if (!event.active) simulation.alphaTarget(0);
         d.fx = null;
         d.fy = null;
     }
 }

 function calculateNodeStats(nodeId, transactions) {
     let out = 0, inCount = 0, volume = 0;
     transactions.forEach(tx => {
         if (tx.sender_id === nodeId) {
             out++;
             volume += tx.amount;
         }
         if (tx.receiver_id === nodeId) {
             inCount++;
             volume += tx.amount;
         }
     });
     return { out, in: inCount, volume };
 }

 function renderRingsTable(rings) {
     const tbody = document.getElementById('rings-table-body');
     tbody.innerHTML = rings.map(ring => `
         <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
             <td class="py-3 px-4 font-mono text-indigo-400">${ring.ring_id}</td>
             <td class="py-3 px-4">
                 <span class="px-2 py-1 rounded text-xs font-bold ${
                     ring.pattern_type === 'cycle' ? 'bg-red-900/50 text-red-400 border border-red-500/50' :
                     ring.pattern_type.includes('fan') ? 'bg-orange-900/50 text-orange-400 border border-orange-500/50' :
                     'bg-yellow-900/50 text-yellow-400 border border-yellow-500/50'
                 }">${ring.pattern_type.toUpperCase().replace('_', ' ')}</span>
             </td>
             <td class="py-3 px-4 text-white">${ring.member_accounts.length}</td>
             <td class="py-3 px-4">
                 <div class="flex items-center gap-2">
                     <div class="w-16 bg-slate-700 rounded-full h-2">
                         <div class="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full" style="width: ${ring.risk_score}%"></div>
                     </div>
                     <span class="text-white font-mono">${ring.risk_score}</span>
                 </div>
             </td>
             <td class="py-3 px-4 text-slate-400 font-mono text-xs max-w-xs truncate" title="${ring.member_accounts.join(', ')}">
                 ${ring.member_accounts.join(', ')}
             </td>
         </tr>
     `).join('');
 }

 function renderAccountsTable(accounts) {
     const tbody = document.getElementById('accounts-table-body');
     tbody.innerHTML = accounts.map(acc => `
         <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
             <td class="py-3 px-4 font-mono text-white">${acc.account_id}</td>
             <td class="py-3 px-4">
                 <div class="flex items-center gap-2">
                     <div class="w-16 bg-slate-700 rounded-full h-2">
                         <div class="bg-gradient-to-r from-red-600 to-red-400 h-2 rounded-full" style="width: ${acc.suspicion_score}%"></div>
                     </div>
                     <span class="text-red-400 font-bold font-mono">${acc.suspicion_score}</span>
                 </div>
             </td>
             <td class="py-3 px-4">
                 <div class="flex flex-wrap gap-1">
                     ${acc.detected_patterns.map(p => `
                         <span class="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300">${p}</span>
                     `).join('')}
                 </div>
             </td>
             <td class="py-3 px-4 font-mono text-indigo-400">${acc.ring_id}</td>
         </tr>
     `).join('');
 }

 function downloadJSON() {
     if (!analysisResults) return;
     
     const output = {
         suspicious_accounts: analysisResults.suspicious_accounts,
         fraud_rings: analysisResults.fraud_rings,
         summary: analysisResults.summary
     };
     
     const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `fraud_analysis_${new Date().toISOString().slice(0,10)}.json`;
     a.click();
 }

 function resetAnalysis() {
     // Clear visualization
     d3.select('#graph-svg').selectAll('*').remove();
     if (simulation) simulation.stop();
     
     // Reset state
     analysisResults = null;
     
     // Reset UI
     document.getElementById('results-section').classList.add('hidden');
     document.getElementById('processing-section').classList.add('hidden');
     document.getElementById('upload-section').classList.remove('hidden');
     document.getElementById('csv-input').value = '';
 }

 // Handle window resize for graph
 window.addEventListener('resize', () => {
     if (analysisResults) {
         d3.select('#graph-svg').selectAll('*').remove();
         renderGraph(analysisResults);
     }
 });