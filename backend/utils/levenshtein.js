function levenshteinDistance(a, b) {

    const rows = a.length + 1;
    const cols = b.length + 1;

    const table = [];

    for (let i = 0; i < rows; i++) {
        table.push([i]);
    }

    for (let j = 0; j < cols; j++) {
        table[0][j] = j;
    }

    for (let i = 1; i < rows; i++) {

        for (let j = 1; j < cols; j++) {

            if (a[i - 1] === b[j - 1]) {
                table[i][j] = table[i - 1][j - 1];
            } else {
                table[i][j] = 1 + Math.min(
                    table[i - 1][j],     // delete
                    table[i][j - 1],     // insert
                    table[i - 1][j - 1]  // replace
                );
            }

        }

    }

    return table[rows - 1][cols - 1];

}

module.exports = levenshteinDistance;