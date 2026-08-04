const knowledge = [
    {
        keywords: ["hello", "hi"],
        answer:
        "Hello! I am ASTRA, your AsiaTech Smart Technology & Resource Assistant."
    },

    {
        keywords: ["registrar", "office"],
        answer:
        "The Registrar's Office is located at the Administration Building."
    },

    {
        keywords: ["library"],
        answer:
        "The library is available for students during school operating hours."
    },

    {
        keywords: ["enrollment"],
        answer:
        "Enrollment requirements can be requested from the Registrar's Office."
    }
];


function searchAnswer(question){

    const text = question.toLowerCase();


    for(let item of knowledge){

        for(let keyword of item.keywords){

            if(text.includes(keyword)){

                return item.answer;

            }

        }

    }


    return "I don't have information about that yet.";

}


module.exports = searchAnswer;