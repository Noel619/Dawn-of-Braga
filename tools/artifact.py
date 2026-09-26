# Genera una variante del build sin el esqueleto <html>/<head>/<body>
# (para publicarla como página que se envuelve en su propio documento).
import re, sys
src = open('dist/index.html', encoding='utf-8').read()
s = re.sub(r'<!doctype html>\s*', '', src, flags=re.I)
s = re.sub(r'<html[^>]*>\s*', '', s, flags=re.I)
s = re.sub(r'</?head>\s*', '', s, flags=re.I)
s = re.sub(r'<body[^>]*>\s*', '', s, flags=re.I)
s = re.sub(r'\s*</body>\s*', '\n', s, flags=re.I)
s = re.sub(r'\s*</html>\s*', '\n', s, flags=re.I)
# el <title> debe estar entre los primeros 8 KB
i = s.find('<title>')
assert 0 <= i < 8000, i
out = sys.argv[1] if len(sys.argv) > 1 else 'dist/artifact.html'
open(out, 'w', encoding='utf-8').write(s)
print(out, len(s))
