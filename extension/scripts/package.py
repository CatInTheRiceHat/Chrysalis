"""Deterministic ZIP + independently extracted unpacked assets; Python stdlib only."""
from pathlib import Path
import hashlib
import json
import platform
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def package():
    expected = sorted(json.loads((ROOT / 'scripts/package-files.json').read_text()))
    subprocess.run(['node', 'scripts/verify-build.mjs'], cwd=ROOT, check=True)
    version = json.loads((ROOT / 'package.json').read_text())['version']
    name = f'chrysalis-{version}'
    release = ROOT / 'release'
    if release.is_symlink():
        raise ValueError('Release directory must not be a symlink')
    release.mkdir(exist_ok=True)
    source = {file: (ROOT / 'dist' / file).read_bytes() for file in expected}
    # Fixed metadata and ZIP_STORED avoid time, platform and zlib-version variance.
    with tempfile.TemporaryDirectory(prefix='.package-', dir=release) as temporary:
        stage = Path(temporary)
        archive = stage / f'{name}.zip'
        with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_STORED) as output:
            for file, data in source.items():
                info = zipfile.ZipInfo(file, date_time=(2020, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_STORED
                output.writestr(info, data)
        extracted = stage / f'{name}-unpacked'
        extracted.mkdir()
        with zipfile.ZipFile(archive) as output:
            assert output.namelist() == expected, 'ZIP file list differs'
            assert output.testzip() is None, 'ZIP CRC check failed'
            for file in expected:
                # Only trusted allowlisted paths; no unchecked extractall().
                data = output.read(file)
                assert data == source[file], f'ZIP content differs: {file}'
                target = extracted / file
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
        subprocess.run(['node', 'scripts/verify-build.mjs', str(extracted)], cwd=ROOT, check=True)
        hashes = {file: digest(data) for file, data in source.items()}
        assert all(digest((extracted / file).read_bytes()) == value for file, value in hashes.items())
        report = {'version': version, 'zip': archive.name, 'sha256': digest(archive.read_bytes()),
                  'unpacked': extracted.name, 'files': hashes,
                  'toolchain': {'node': subprocess.check_output(['node', '--version'], text=True).strip(),
                                'python': platform.python_version()},
                  'archiveFormat': 'ZIP_STORED; sorted paths; fixed UTC-independent DOS date; mode 0644',
                  'verification': 'Every ZIP and extracted byte matches the verified production build. Not a signature or store approval.'}
        # Only generated artifacts with these exact names are replaced.
        for item in [archive, extracted]:
            destination = release / item.name
            if destination.is_symlink():
                raise ValueError(f'Refusing to replace symlink: {destination.name}')
            if destination.is_dir():
                shutil.rmtree(destination)
            item.replace(destination)
        (release / f'{name}-build-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
        (release / f'{name}.sha256').write_text(f'{report["sha256"]}  {name}.zip\n')
        print(f'Packaged {len(expected)} required assets: {release / archive.name}')
        print(f'Unpacked directory: {release / extracted.name}')
        print(f'SHA-256: {report["sha256"]}')

if __name__ == '__main__':
    package()
