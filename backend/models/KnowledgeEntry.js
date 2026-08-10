const levenshteinDistance = require("../utils/levenshtein");

class KnowledgeEntry {

    constructor(id, category, title, keywords, content) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.keywords = keywords;
        this.content = content;
    }

    findMatch(question) {

        const text = question.toLowerCase();
        const words = text.split(/\s+/);

        // First pass: check for an exact substring match, same as before.
        for (let keyword of this.keywords) {
            if (text.includes(keyword)) {
                return { exact: true, keyword: keyword };
            }
        }

        // Second pass: no exact match, so check each word against
        // each keyword for a close-but-not-exact typo match.
        for (let word of words) {

            for (let keyword of this.keywords) {

                // Skip typo-matching entirely for very short keywords —
                // too many unrelated short words end up within 1-2 edits
                // of them, causing false positives like "i" matching "hi".
                if (keyword.length < 5) continue;

                const distance = levenshteinDistance(word, keyword);
                const maxDistance = keyword.length <= 8 ? 1 : 2;

                if (distance > 0 && distance <= maxDistance) {
                    return { exact: false, keyword: keyword };
                }

            }

        }

        return null;

    }

    matches(question) {
        return this.findMatch(question) !== null;
    }

}

module.exports = KnowledgeEntry;