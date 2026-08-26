const RELEASE_API = 'https://api.github.com/repos/L7A9/nexus-CodeWeaver-releases/releases/latest';
const RELEASES_PAGE = 'https://github.com/L7A9/nexus-CodeWeaver-releases/releases/latest';
const FALLBACK_VERSION = '0.1.1';
const FALLBACK_INSTALLER = 'https://github.com/L7A9/nexus-CodeWeaver-releases/releases/download/v0.1.1/nexus-0.1.1-windows-x64-setup.exe';

function setRelease(version, installer, status) {
  document.querySelectorAll('[data-version]').forEach((node) => { node.textContent = version; });
  document.querySelectorAll('[data-download]').forEach((link) => {
    const download = installer[link.dataset.download];
    link.href = download || RELEASES_PAGE;
    if (download) link.setAttribute('download', '');
    else link.removeAttribute('download');
  });
  document.querySelectorAll('[data-download-status]').forEach((node) => { node.textContent = status; });
}

async function loadLatestRelease() {
  try {
    const response = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const release = await response.json();
    const assets = release.assets || [];
    const windowsAsset = assets.find((item) => /nexus-.*-windows-x64-setup\.exe$/i.test(item.name));
    const linuxAsset = assets.find((item) => /^nexus[-_].*\.deb$/i.test(item.name));
    const version = (release.tag_name || FALLBACK_VERSION).replace(/^v/, '');
    if (!windowsAsset) throw new Error('No Windows installer in the latest release');
    const linuxStatus = linuxAsset ? 'Linux .deb ready' : 'Linux .deb not in this release';
    setRelease(version, {
      windows: windowsAsset.browser_download_url,
      linux: linuxAsset?.browser_download_url,
    }, `v${version} · Windows x64 installer · ${linuxStatus}`);
  } catch (error) {
    setRelease(FALLBACK_VERSION, { windows: FALLBACK_INSTALLER }, `v${FALLBACK_VERSION} · Windows x64 installer · Linux .deb unavailable`);
    console.warn('Using the fallback release link:', error);
  }
}

document.querySelectorAll('[data-download]').forEach((link) => {
  link.addEventListener('click', () => { link.classList.add('is-downloading'); });
});
document.querySelectorAll('a[href$="/releases/latest"]').forEach((link) => { link.href = RELEASES_PAGE; });
loadLatestRelease();
