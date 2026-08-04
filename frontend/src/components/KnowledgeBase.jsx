const knowledge = [
  {
    keywords: ["registrar", "office"],
    answer:
      "The Registrar's Office is located at the Administration Building."
  },

  {
    keywords: ["enrollment", "requirements"],
    answer:
      "Enrollment requirements can be requested from the Registrar's Office."
  },

  {
    keywords: ["library"],
    answer:
      "The library is available for students during school operating hours."
  },

  {
    keywords: ["hello", "hi"],
    answer:
      "Hello! I am ASTRA, your AsiaTech Smart Technology & Resource Assistant."
  }
];


function searchAnswer(question){

  const words = question.toLowerCase();


  for(let item of knowledge){

    for(let keyword of item.keywords){

      if(words.includes(keyword)){

        return item.answer;

      }

    }

  }


  return "I don't have information about that yet.";
}


export { searchAnswer };