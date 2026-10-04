#!/usr/bin/env python3
"""Check pinned language source, every resource byte, and editor UI source keys."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT.parent / 'zukbox-lang')
    parser.add_argument('--manifest', type=Path, default=ROOT / '.github/language-source.json')
    args = parser.parse_args()
    try:
        pinned = json.loads(args.manifest.read_text(encoding='utf-8'))
        if pinned['repository'] != 'zukuapp/zukbox-lang' or re.fullmatch(r'[0-9a-f]{40}', pinned['commit']) is None:
            raise ValueError('Expected a pinned zukuapp/zukbox-lang commit')
        head = subprocess.run(['git', '-C', str(args.source), 'rev-parse', 'HEAD'], check=True, capture_output=True, text=True).stdout.strip()
        if head != pinned['commit']:
            raise ValueError(f'Language source commit differs: expected {pinned["commit"]}, actual {head}')
        source_manifest_path = args.source / 'validation/manifest.json'
        digest = hashlib.sha256(source_manifest_path.read_bytes()).hexdigest()
        if digest != pinned['manifest_sha256']:
            raise ValueError('Language source manifest SHA256 differs')
        source_manifest = json.loads(source_manifest_path.read_text(encoding='utf-8'))
        if source_manifest['files'] != pinned['files']:
            raise ValueError('Editor file hashes differ from the pinned language manifest')
        spec = importlib.util.spec_from_file_location('language_validation', args.source / 'scripts/validate_locales.py')
        validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(validator)
        tables, errors = validator.validate(args.source / 'docs')
        if not errors:
            if validator.file_manifest(args.source / 'docs') != pinned['files']:
                errors.append({'code': 'stale_source_files'})
            errors.extend(validator.check_editor(args.source / 'docs', ROOT))
            runtime = ROOT / source_manifest['consumer']['runtime_path']
            if validator.sha256(runtime) != source_manifest['consumer']['runtime_sha256']:
                errors.append({'code': 'runtime_sha'})
            audit = validator.source_audit(tables, ROOT)
            errors.extend({'code': 'editor_source_key_missing', 'key': key} for key in audit['literal_keys_missing_from_locales'])
        print(json.dumps({'source_commit': head, 'locales': len(tables), 'unique_keys': len(dict(tables['japanese'])), 'errors': errors}, ensure_ascii=False))
        return bool(errors)
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        print(json.dumps({'errors': [{'code': 'pinned_source', 'message': str(exc)}]}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    sys.exit(main())
