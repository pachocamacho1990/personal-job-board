/**
 * Journey Map Module
 * Renders an SVG timeline showing job status progression over time.
 * Depends on: shared/utils.js (formatFullDate, formatRelativeTime)
 *
 * Stateless — called on-demand by Center Peek. No init function needed.
 */

function renderJourneyMap(history, currentStatus) {
    const container = document.getElementById('journeyGraph');
    if (!container) return;

    // Columns config - Matches job board column order
    const columns = ['interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected', 'archived'];

    // Fixed width per column for horizontal scroll
    const colWidth = 100;
    const padding = { top: 50, right: 30, bottom: 30, left: 30 };
    const totalWidth = padding.left + (columns.length - 1) * colWidth + padding.right;
    const width = Math.max(container.clientWidth || 500, totalWidth);
    const height = Math.max(350, history.length * 80 + 120);

    // Combine history + current state if not redundant
    // Visualize Top = Oldest, Bottom = Newest (Time flows down)
    const sortedHistory = [...history].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

    // Map status to an X coordinate
    function getX(status) {
        let idx = columns.indexOf(status);
        if (idx === -1) {
            idx = 0; // Default to first column for unknown statuses
        }
        return padding.left + (idx * colWidth);
    }

    // Generate Nodes
    const nodes = [];

    // 1. Add Start Node (from first history entry's previous_status)
    if (sortedHistory.length > 0) {
        const firstEntry = sortedHistory[0];
        if (firstEntry.previous_status) {
            nodes.push({
                x: getX(firstEntry.previous_status),
                y: padding.top,
                status: firstEntry.previous_status,
                date: firstEntry.changed_at,
                label: 'Start',
                isCurrent: false,
                isStart: true
            });
        }
    }

    // 2. Add History Nodes (new_status)
    sortedHistory.forEach((entry, i) => {
        // Offset y to accommodate start node
        const yOffset = (nodes.length > 0 && nodes[0].isStart) ? ((i + 1) * 80) : (i * 80);

        nodes.push({
            x: getX(entry.new_status),
            y: padding.top + yOffset,
            status: entry.new_status,
            date: entry.changed_at,
            label: formatFullDate(entry.changed_at),
            isCurrent: false
        });
    });

    // If no history, show current status as single node
    if (nodes.length === 0) {
        nodes.push({
            x: getX(currentStatus),
            y: padding.top,
            status: currentStatus,
            date: new Date().toISOString(),
            label: 'Current Status',
            isCurrent: true
        });
    } else {
        // Mark last as current
        nodes[nodes.length - 1].isCurrent = true;
    }

    // SVG Content
    let svgHtml = `<svg width="${width}" height="${height}" style="overflow: visible;">`;

    // 1. Draw Column Lines & Labels
    columns.forEach((col, i) => {
        const x = padding.left + (i * colWidth);
        // Line - lighter color, contained within SVG bounds
        svgHtml += `<line x1="${x}" y1="${padding.top + 10}" x2="${x}" y2="${height - padding.bottom}" stroke="#E2E8F0" stroke-dasharray="4" />`;
        // Label - full name, centered on column
        const label = col.charAt(0).toUpperCase() + col.slice(1);
        svgHtml += `<text x="${x}" y="${padding.top - 5}" class="status-column-label">${label}</text>`;
    });

    // 2. Draw Paths
    let pathD = "";
    if (nodes.length > 1) {
        pathD = `M ${nodes[0].x} ${nodes[0].y}`;
        for (let i = 1; i < nodes.length; i++) {
            pathD += ` L ${nodes[i].x} ${nodes[i].y}`;
        }
        svgHtml += `<path d="${pathD}" class="journey-path active" />`;
    }

    // 3. Draw Nodes
    nodes.forEach(node => {
        const r = node.isCurrent ? 10 : 6;
        const classes = `journey-node ${node.isCurrent ? 'active' : ''}`;
        svgHtml += `<circle cx="${node.x}" cy="${node.y}" r="${r}" class="${classes}" />`;

        // Date Label - positioned consistently to the right of node
        svgHtml += `<text x="${node.x + 15}" y="${node.y + 4}" class="time-label">${formatRelativeTime(node.date)}</text>`;
    });

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}
