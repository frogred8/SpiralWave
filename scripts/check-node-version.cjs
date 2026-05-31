const requiredMajor = 22;
const major = Number.parseInt(process.versions.node.split('.')[0], 10);

if (Number.isNaN(major) || major < requiredMajor) {
  console.error(`Node.js ${requiredMajor} 이상이 필요합니다. 현재 버전: ${process.version}`);
  console.error('nvm 사용 시: nvm install && nvm use');
  process.exit(1);
}
