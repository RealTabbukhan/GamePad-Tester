/**
 * GPad Tester — Export Utilities
 * Handles CSV, JSON, and text export for test data.
 */

const Export = {
  /** Download a file with given content */
  download(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /** Export data as CSV */
  toCSV(data, filename = 'gamepad-test-data.csv') {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        val = String(val);
        // Escape quotes and wrap in quotes if contains comma/newline
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    this.download(filename, csv, 'text/csv;charset=utf-8;');
  },

  /** Export data as JSON */
  toJSON(data, filename = 'gamepad-test-data.json') {
    const json = JSON.stringify(data, null, 2);
    this.download(filename, json, 'application/json');
  },

  /** Export data as formatted text report */
  toTextReport(title, sections, filename = 'gamepad-test-report.txt') {
    let report = '';
    report += '='.repeat(60) + '\n';
    report += `  ${title}\n`;
    report += `  Generated: ${new Date().toLocaleString()}\n`;
    report += `  Source: GPad Tester (gpadtester.org)\n`;
    report += '='.repeat(60) + '\n\n';

    sections.forEach(section => {
      report += `--- ${section.title} ---\n`;
      if (section.data) {
        Object.entries(section.data).forEach(([key, value]) => {
          report += `  ${key}: ${value}\n`;
        });
      }
      if (section.text) {
        report += `  ${section.text}\n`;
      }
      report += '\n';
    });

    report += '='.repeat(60) + '\n';
    report += '  End of Report\n';
    report += '='.repeat(60) + '\n';

    this.download(filename, report, 'text/plain');
  },

  /** Format a timestamp for display */
  formatTimestamp(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString();
  },

  /** Create a timestamped filename */
  makeFilename(prefix, extension = 'csv') {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${dateStr}.${extension}`;
  }
};
