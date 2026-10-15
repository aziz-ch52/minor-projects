"""Bundles the ES modules + CSS into one play.html that works when double-clicked (file://)."""
import re, pathlib
root = pathlib.Path(__file__).parent
order = ['environment/Terrain', 'engine/Physics', 'engine/InputHandler', 'engine/GameContext',
         'entities/Tank', 'entities/Particle', 'entities/Projectile', 'main']
parts = []
for name in order:
    src = (root / 'js' / f'{name}.js').read_text()
    src = re.sub(r'^import .*?;\s*$', '', src, flags=re.M)
    src = re.sub(r'^export ', '', src, flags=re.M)
    parts.append(f'// ---- {name} ----\n{src}')
bundle = '(() => {\n"use strict";\n' + '\n'.join(parts) + '\n})();'
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + (root / 'css/style.css').read_text() + '\n</style>')
html = html.replace('<script type="module" src="js/main.js"></script>', '<script>\n' + bundle + '\n</script>')
(root / 'play.html').write_text(html)
(root / 'bundle.tmp.js').write_text(bundle)
print('built play.html', len(html), 'bytes')
