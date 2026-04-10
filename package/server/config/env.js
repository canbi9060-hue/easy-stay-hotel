const fs = require('fs');
const path = require('path');

const envFileCandidates = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
];

const stripWrappingQuotes = (value) => {
  if (value.length < 2) {
    return value;
  }

  const firstChar = value[0];
  const lastChar = value[value.length - 1];
  if ((firstChar === '"' && lastChar === '"') || (firstChar === '\'' && lastChar === '\'')) {
    return value.slice(1, -1);
  }

  return value;
};

const normalizeEnvValue = (rawValue) => stripWrappingQuotes(rawValue.trim())
  .replace(/\\n/g, '\n')
  .replace(/\\r/g, '\r');

const applyEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1);
    if (!key || process.env[key] !== undefined) {
      return;
    }

    process.env[key] = normalizeEnvValue(rawValue);
  });

  return true;
};

envFileCandidates.some(applyEnvFile);

module.exports = {
  envFileCandidates,
};
