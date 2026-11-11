const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const PORT = process.env.PORT || 4400;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf'
};

module.exports = {
  PORT,
  ROOT_DIR,
  DATA_DIR,
  WORKSPACE_FILE,
  OUTPUT_DIR,
  MIME_TYPES
};

