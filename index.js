var SCORE_MIN = -Infinity;
var SCORE_MAX = Infinity;

var SCORE_GAP_LEADING = -0.005
var SCORE_GAP_TRAILING = -0.005
var SCORE_GAP_INNER = -0.01
var SCORE_MATCH_CONSECUTIVE = 1.0
var SCORE_MATCH_SLASH = 0.9
var SCORE_MATCH_WORD = 0.8
var SCORE_MATCH_CAPITAL = 0.7
var SCORE_MATCH_DOT = 0.6

const islower = s => s.toLowerCase() === s;
const isupper = s => s.toUpperCase() === s;

function precompute_bonus(haystack) {
    let last_ch = ' ';
    return [...haystack].map(ch => {
        let bonus = 0;

        if (last_ch === '-' || last_ch === ' ')
            bonus = SCORE_MATCH_WORD;
        else if (last_ch === '.')
            bonus = SCORE_MATCH_DOT;

        last_ch = ch;
        return bonus;
    });
}

const multi_match_map = {ا: 'اأآإى', أ: 'أإءؤئ', ء: 'ءأإؤئ', ت: 'تة', ة: 'ةته', ه: 'هة', ى: 'ىي'};
Object.keys(multi_match_map).forEach(k => {
    multi_match_map[k] = Object.fromEntries([...multi_match_map[k]].map(c => [c, true]));
});
function compute(needle, haystack) {
    const D = Array(n);
    const M = Array(n);
    var n = needle.length;
    var m = haystack.length;

    var match_bonus = precompute_bonus(haystack);

    /*
     * D[][] Stores the best score for this position ending with a match.
     * M[][] Stores the best possible score at this position.
     */

    for (var i = 0; i < n; i++) {
        D[i] = Array(m);
        M[i] = Array(m);

        var prev_score = SCORE_MIN;
        var gap_score = i === n - 1 ? SCORE_GAP_TRAILING : SCORE_GAP_INNER;

        for (var j = 0; j < m; j++) {
            if (needle[i] === haystack[j] || (multi_match_map[needle[i]] && multi_match_map[needle[i]][haystack[j]])) {
                var score = SCORE_MIN;
                if (!i)
                    score = (j * SCORE_GAP_LEADING) + match_bonus[j];
                else if (j) { /* i > 0 && j > 0*/
                    score = Math.max(
                        M[i - 1][j - 1] + match_bonus[j],

                        /* consecutive match, doesn't stack with match_bonus */
                        D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE);
                }
                D[i][j] = score;
                M[i][j] = prev_score = Math.max(score, prev_score + gap_score);
            }
            else {
                D[i][j] = SCORE_MIN;
                M[i][j] = prev_score = prev_score + gap_score;
            }
        }
    }
    return [D, M];
}

function score(needle, haystack) {
    var n = needle.length;
    var m = haystack.length;

    if (!n || !m)
        return SCORE_MIN;

    if (n === m) {
        /* Since this method can only be called with a haystack which
         * matches needle. If the lengths of the strings are equal the
         * strings themselves must also be equal (ignoring case).
         */
        return SCORE_MAX;
    }

    if (m > 1024) {
        /*
         * Unreasonably large candidate: return no score
         * If it is a valid match it will still be returned, it will
         * just be ranked below any reasonably sized candidates
         */
        return SCORE_MIN;
    }

    const [D, M] = compute(needle, haystack);

    return M[n - 1][m - 1];
}

function positions(needle, haystack) {
    var n = needle.length;
    var m = haystack.length;

    var positions = Array(n);

    if (!n || !m)
        return positions;

    if (n === m) {
        for (var i = 0; i < n; i++)
            positions[i] = i;
        return positions;
    }

    if (m > 1024) {
        return positions;
    }

    const [D, M] = compute(needle, haystack);

    /* backtrack to find the positions of optimal matching */
    var match_required = false;

    for (var i = n - 1, j = m - 1; i >= 0; i--) {
        for (; j >= 0; j--) {
            /*
             * There may be multiple paths which result in
             * the optimal weight.
             *
             * For simplicity, we will pick the first one
             * we encounter, the latest in the candidate
             * string.
             */
            if (D[i][j] !== SCORE_MIN && (match_required || D[i][j] === M[i][j])) {
                /* If this score was determined using
                 * SCORE_MATCH_CONSECUTIVE, the
                 * previous character MUST be a match
                 */
                match_required = i && j && M[i][j] === D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE;
                positions[i] = j--;
                break;
            }
        }
    }

    return positions;
}

function highlight(needle, haystack) {
    const indexes = positions(needle, haystack);
    haystack = [...haystack].map((c, i) => {
        if (i === indexes[0]) {
            indexes.shift();
            c = `<mark>${c}</mark>`;
        }
        return c;
    }).join('');
    haystack = haystack.replaceAll('</mark><mark>', '');
    return haystack;
}

export {score, highlight};
