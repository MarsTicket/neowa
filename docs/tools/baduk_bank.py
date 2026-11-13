# 바둑 묘수풀이 문제 묶음을 게임 코드(docs/tools/games/baduk.js)에 넣는 도구
# 사용법: python3 docs/tools/baduk_bank.py 문제파일.txt [문제파일2.txt ...]
#   (문제 파일은 node docs/tools/baduk_problems.js 의 출력. 같은 판은 한 번만 들어감)
import re, sys
lines, seen = [], set()
for f in sys.argv[1:]:
    for l in open(f, encoding='utf8'):
        l = l.strip()
        if not re.match(r'^[234]\|[.XO]{81}\|[0-9a-z]{2}\|([0-9a-z]{2})+$', l): continue
        if l.split('|')[1] in seen: continue
        seen.add(l.split('|')[1]); lines.append(l)
lines.sort(key=lambda l: l[0])
p = 'docs/tools/games/baduk.js'
s = open(p, encoding='utf8').read()
new = "var BANK = (/*BANK:START*/'" + ' '.join(lines) + "'/*BANK:END*/).split(' ');"
s2, n = re.subn(r"var BANK = .*?;\n", lambda m: new + "\n", s, count=1)
assert n == 1
open(p, 'w', encoding='utf8').write(s2)
from collections import Counter
print('문제 수:', dict(Counter(l[0] + '수' for l in lines)))
