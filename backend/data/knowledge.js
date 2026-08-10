const db = require("../database/database");
const KnowledgeEntry = require("../models/KnowledgeEntry");
const { askGemini } = require("../utils/gemini");


function getAllEntries() {

    return new Promise((resolve, reject) => {

        db.all("SELECT * FROM knowledge", [], (err, rows) => {

            if (err) {
                reject(err);
                return;
            }

            const entries = rows.map((row) =>
                new KnowledgeEntry(
                    row.id,
                    row.category,
                    row.title,
                    row.keywords.split(","),
                    row.content
                )
            );

            resolve(entries);

        });

    });

}


async function searchAnswer(question) {

    const entries = await getAllEntries();
    console.log("Entries loaded:", entries.length);
    console.log("Question:", question);

    for (let entry of entries) {

        const result = entry.findMatch(question);

        if (result) {
            console.log("Match found:", entry.title);
            if (result.exact) {
                return entry.content;
            } else {
                return "Did you mean '" + result.keyword + "'? " + entry.content;
            }

        }

    }

    console.log("No keyword match, falling back to Gemini");

    try {
        const aiReply = await askGemini(question, entries);
        return aiReply;
    } catch (error) {
        console.error("Gemini error:", error);
        return "I don't have information about that yet.";
    }

}


function createEntry(category, title, keywords, content) {

    return new Promise((resolve, reject) => {

        const keywordStr = Array.isArray(keywords) ? keywords.join(",") : keywords;

        db.run(
            "INSERT INTO knowledge (category, title, keywords, content) VALUES (?, ?, ?, ?)",
            [category, title, keywordStr, content],
            function (err) {

                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    id: this.lastID,
                    category,
                    title,
                    keywords: keywordStr.split(","),
                    content
                });

            }
        );

    });

}


function updateEntry(id, category, title, keywords, content) {

    return new Promise((resolve, reject) => {

        const keywordStr = Array.isArray(keywords) ? keywords.join(",") : keywords;

        db.run(
            "UPDATE knowledge SET category = ?, title = ?, keywords = ?, content = ? WHERE id = ?",
            [category, title, keywordStr, content, id],
            function (err) {

                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    id,
                    category,
                    title,
                    keywords: keywordStr.split(","),
                    content
                });

            }
        );

    });

}


function deleteEntry(id) {

    return new Promise((resolve, reject) => {

        db.run("DELETE FROM knowledge WHERE id = ?", [id], function (err) {

            if (err) {
                reject(err);
                return;
            }

            resolve({ id, deleted: this.changes > 0 });

        });

    });

}


module.exports = { getAllEntries, searchAnswer, createEntry, updateEntry, deleteEntry };