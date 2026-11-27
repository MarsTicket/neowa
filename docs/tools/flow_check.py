#!/usr/bin/env python3
# 컬러 플로우 레벨 검증기
# - 손으로 설계한 격자(각 색이 하나의 길)가 올바른지 검사
# - 격자에서 끝점만 뽑아, 끝점만으로 푸는 솔버로 실제로 풀리는지 검사
# - 검증된 레벨을 docs/tools/games/flow.js 에 넣을 LEVELS 데이터로 출력
# 사용법: python3 docs/tools/flow_check.py [--emit]
import sys, time

# 손으로 설계한 기본 격자 (행 = 위에서 아래, 글자 = 색)
E1 = [
    "AABBC",
    "ADEBC",
    "ADEBC",
    "ADEEC",
    "ADDEC",
]
E2 = [
    "ABBBB",
    "ACCEB",
    "ADCEE",
    "ADCCE",
    "ADDDE",
]
N1 = [
    "AABBCC",
    "ADEBCF",
    "ADEBCF",
    "ADEBCF",
    "DDEFCF",
    "DEEFFF",
]
N2 = [
    "AAABBB",
    "DDACCB",
    "DAACBB",
    "DECCFF",
    "DECEEF",
    "DEEEFF",
]
H1 = [
    "AABBBBB",
    "ACCDDDB",
    "AFCEEDB",
    "AFCGEDH",
    "AFCGEDH",
    "AFCGEDH",
    "FFCEEHH",
]
H2 = [
    "AAAAAAA",
    "CCCCCCB",
    "DDDDDCB",
    "EFFFDGB",
    "EHHFDGB",
    "EHFFGGB",
    "HHFGGBB",
]

BASES = {"easy": [E1, E2], "normal": [N1, N2], "hard": [H1, H2]}


def neighbors(n, r, c):
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < n and 0 <= nc < n:
            yield nr, nc


def validate_grid(grid):
    """각 색이 빈칸 없이 하나의 길인지 검사. 오류 목록을 돌려준다."""
    n = len(grid)
    errs = []
    if any(len(row) != n for row in grid):
        errs.append("행 길이가 %d가 아님" % n)
        return errs
    colors = {}
    for r in range(n):
        for c in range(n):
            colors.setdefault(grid[r][c], []).append((r, c))
    for col, cells in sorted(colors.items()):
        cellset = set(cells)
        # 연결성
        seen = set([cells[0]])
        stack = [cells[0]]
        while stack:
            r, c = stack.pop()
            for nr, nc in neighbors(n, r, c):
                if (nr, nc) in cellset and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        if len(seen) != len(cells):
            errs.append("색 %s: %d조각으로 끊김" % (col, len(cells) - len(seen) + 1))
            continue
        ends = []
        for (r, c) in cells:
            deg = sum(1 for nr, nc in neighbors(n, r, c) if (nr, nc) in cellset)
            if deg > 2:
                errs.append("색 %s: (%d,%d) 갈림길(차수 %d)" % (col, r, c, deg))
            if deg == 1:
                ends.append((r, c))
        if len(cells) == 1:
            errs.append("색 %s: 칸 1개짜리" % col)
        elif len(ends) != 2:
            errs.append("색 %s: 끝점 %d개 (2개여야 함)" % (col, len(ends)))
    return errs


def dots_of(grid):
    """격자에서 끝점 쌍을 뽑는다. [(색글자, (r1,c1), (r2,c2)), ...]"""
    n = len(grid)
    colors = {}
    for r in range(n):
        for c in range(n):
            colors.setdefault(grid[r][c], []).append((r, c))
    out = []
    for col in sorted(colors):
        cells = set(colors[col])
        ends = [(r, c) for (r, c) in colors[col]
                if sum(1 for nr, nc in neighbors(n, r, c) if (nr, nc) in cells) == 1]
        assert len(ends) == 2, (col, ends)
        out.append((col, ends[0], ends[1]))
    return out


# ---- 솔버: 끝점만 보고 푸는 백트래킹 ----
def solve(n, pairs):
    """pairs: [(색번호, (r1,c1), (r2,c2))]. 풀리면 해법(색별 길)을, 안 풀리면 None을 돌려준다."""
    occ = [[-1] * n for _ in range(n)]
    ends = {}
    for ci, a, b in pairs:
        occ[a[0]][a[1]] = ci
        occ[b[0]][b[1]] = ci
        ends[ci] = (a, b)

    def comp_ok(placed):
        # 남은 빈칸 덩어리마다 아직 안 놓은 색의 끝점이 최소 1개는 있어야 함
        # (끝점이 없는 덩어리는 채울 방법이 없음)
        rem = [ci for ci, _, _ in pairs if ci not in placed]
        if not rem:
            return all(occ[r][c] != -1 for r in range(n) for c in range(n))
        seen = [[False] * n for _ in range(n)]
        for r in range(n):
            for c in range(n):
                if occ[r][c] != -1 or seen[r][c]:
                    continue
                # 빈칸 덩어리
                comp = []
                stack = [(r, c)]
                seen[r][c] = True
                touches = set()
                while stack:
                    cr, cc = stack.pop()
                    comp.append((cr, cc))
                    for nr, nc in neighbors(n, cr, cc):
                        if occ[nr][nc] == -1 and not seen[nr][nc]:
                            seen[nr][nc] = True
                            stack.append((nr, nc))
                        elif occ[nr][nc] >= 0:
                            touches.add(occ[nr][nc])
                # 덩어리에 닿은 남은 색 끝점이 없으면 실패
                if not any(ci in touches for ci in rem):
                    return False
        # 남은 색마다 두 끝점이 빈칸으로 이어져 있어야 함
        for ci in rem:
            a, b = ends[ci]
            stack = [a]
            seen2 = set([a])
            ok = False
            while stack:
                cr, cc = stack.pop()
                if (cr, cc) == b:
                    ok = True
                    break
                for nr, nc in neighbors(n, cr, cc):
                    if (nr, nc) in seen2:
                        continue
                    if occ[nr][nc] == -1 or (nr, nc) == b:
                        seen2.add((nr, nc))
                        stack.append((nr, nc))
            if not ok:
                return False
        return True

    def paths_for(ci, limit=400):
        a, b = ends[ci]
        res = []
        # DFS, 짧은 길부터 찾도록 이웃을 목표에 가까운 순으로
        def dfs(cur, path, visited):
            if len(res) >= limit:
                return
            if cur == b:
                res.append(list(path))
                return
            nxts = []
            for nr, nc in neighbors(n, cur[0], cur[1]):
                if (nr, nc) in visited:
                    continue
                if occ[nr][nc] != -1 and (nr, nc) != b:
                    continue
                nxts.append((abs(nr - b[0]) + abs(nc - b[1]), (nr, nc)))
            nxts.sort()
            for _, nb in nxts:
                visited.add(nb)
                path.append(nb)
                dfs(nb, path, visited)
                path.pop()
                visited.remove(nb)
        dfs(a, [a], set([a]))
        res.sort(key=len)
        return res

    order = sorted(range(len(pairs)), key=lambda ci: abs(ends[ci][0][0] - ends[ci][1][0]) + abs(ends[ci][0][1] - ends[ci][1][1]))
    solution = {}

    def rec(k):
        if k == len(order):
            return all(occ[r][c] != -1 for r in range(n) for c in range(n))
        ci = order[k]
        for p in paths_for(ci):
            for (r, c) in p:
                occ[r][c] = ci
            solution[ci] = p
            if comp_ok(set(solution.keys())) and rec(k + 1):
                return True
            for (r, c) in p:
                if (r, c) not in (ends[ci][0], ends[ci][1]):
                    occ[r][c] = -1
            del solution[ci]
        return False

    if rec(0):
        return solution
    return None


# ---- 변환 (대칭 이동으로 새 레벨 만들기) ----
def rot90(grid):
    n = len(grid)
    return ["".join(grid[n - 1 - j][i] for j in range(n)) for i in range(n)]

def flip_h(grid):
    return [row[::-1] for row in grid]

def transpose(grid):
    n = len(grid)
    return ["".join(grid[c][r] for c in range(n)) for r in range(n)]

def permute_colors(grid, perm):
    mp = {}
    for i, ch in enumerate(sorted(set("".join(grid)))):
        mp[ch] = perm[i % len(perm)]
    return ["".join(mp[ch] for ch in row) for row in grid]

TRANSFORMS = [
    ("rot90", rot90),
    ("rot180", lambda g: rot90(rot90(g))),
    ("rot270", lambda g: rot90(rot90(rot90(g)))),
    ("flipH", flip_h),
    ("transpose", transpose),
]


def build_levels():
    levels = {}
    for diff, bases in BASES.items():
        got = []
        seen_dots = set()
        for bi, base in enumerate(bases):
            cands = [("base%d" % bi, base)]
            for name, fn in TRANSFORMS:
                cands.append(("base%d-%s" % (bi, name), fn(base)))
            for name, g in cands:
                errs = validate_grid(g)
                if errs:
                    print("  [무효 %s %s] %s" % (diff, name, "; ".join(errs)))
                    continue
                dots = dots_of(g)
                key = tuple(sorted((a, b) for _, a, b in dots))
                if key in seen_dots:
                    continue
                seen_dots.add(key)
                got.append((name, g, dots))
                if len(got) >= 10:
                    break
            if len(got) >= 10:
                break
        levels[diff] = got
    return levels


def main():
    emit = "--emit" in sys.argv
    levels = build_levels()
    total_ok = 0
    for diff, got in levels.items():
        print("[%s] %d개 레벨" % (diff, len(got)))
        for idx, (name, g, dots) in enumerate(got):
            n = len(g)
            pairs = [(i, a, b) for i, (_, a, b) in enumerate(dots)]
            t0 = time.time()
            sol = solve(n, pairs)
            dt = time.time() - t0
            if sol is None:
                print("  %2d %-16s %dx%d 색%d개: 솔버 실패!" % (idx + 1, name, n, n, len(dots)))
            else:
                total_ok += 1
                print("  %2d %-16s %dx%d 색%d개: 풀이 확인 (%.2f초)" % (idx + 1, name, n, n, len(dots), dt))
    print("솔버 확인 완료: %d개 레벨" % total_ok)
    if emit:
        out = ["// LEVELS: docs/tools/flow_check.py 로 검증한 손 설계 레벨 (끝점만으로 솔버 확인 완료)",
               "var LEVELS = {"]
        for diff, got in levels.items():
            out.append("  %d: [" % ["easy", "normal", "hard"].index(diff))
            for name, g, dots in got:
                n = len(g)
                ds = ", ".join("[%d,%d,%d]" % (a[0], a[1], 0) for _, a, b in dots for a in [a])
                # 끝점 쌍을 [r1,c1,r2,c2,색번호] 형태로
                ds = ", ".join("[%d,%d,%d,%d,%d]" % (a[0], a[1], b[0], b[1], i) for i, (_, a, b) in enumerate(dots))
                out.append("    { n: %d, dots: [%s] }, // %s" % (n, ds, name))
            out.append("  ],")
        out.append("};")
        print("\n".join(out))


if __name__ == "__main__":
    main()
