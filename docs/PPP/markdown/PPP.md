---
marp: true
theme: default
paginate: true
---

# StudyPal

---

### Project Description

StudyPal is an intelligent study assistant designed to help students learn more efficiently.  
With just a few simple inputs, users can turn their notes into flashcards, quizzes, and practice questions to help reinforce key concepts.   
Whether you're preparing for exams or reviewing class material, this app generates personalized study tools that adapt to your learning needs.

---

### Problem Domain

Students today face the challenge of efficiently managing and retaining large amounts of study material.  
Traditional study methods like reading notes can be time-consuming and often ineffective.  
Existing study tools, such as flashcard apps and quizzes, require manual input forcing students to spend valuable time creating their own study materials.

This project aims to address these issues by providing an intelligent study assistant that automatically generates flashcards and quizzes from existing notes.  
With these generated study tools, it will help students engage with their material more effectively, saving time and enhancing learning through interactive, personalized tools.

---

### Tools

- **DistilGPT-2** LLM for the generation of flashcards and questions, utilizing this through the Hugging Face API
- **React** for the Front End
- **Node.js + Express** for the Back End
- **PostgreSQL** for Database
- **Heroku** for deployment

---

# Features & Requirements

---

1. **Content Import**:  
   - Allow users to upload notes (e.g., .txt, .docx, PDF) for flashcard and quiz generation

2. **Flashcard Generation**:  
   - Automatically generate flashcards from user-uploaded notes  
   - Allow users to specify the number of flashcards they want to create  
   - Include multiple question types: multiple-choice, true/false, fill-in-the-blank

3. **Quiz Generation**:  
   - Create quizzes based on the user's notes  
   - Support multiple-choice questions and short-answer questions  
   - Provide feedback (correct/incorrect) for each quiz question

4. **Study Material Storage**:  
   - Store flashcards, quizzes, and study materials for each user  
   - Allow users to view their study history, including previously generated materials

5. **Categorization**:  
   - Allow users to categorize their study materials (e.g. "Math", "History", "Biology")

6. **Flashcard Review Mode**:  
   - Provide a review mode where users can review flashcards from selected decks  
   - Present flashcards with question-first layout and allow users to flip to reveal the answer  
   - Track user progress and show how well they are learning the topic

---

# Schedule

---

### Sprint 1

**Week 1**  
- Finalize project scope, tech stack, and features  
- Set up project structure and environment  

**Week 2**  
- Implement user account system for storing flashcards, quizzes, and notes  
- Allow users to view study history and edit materials  

**Week 3**  
- Implement file upload functionality for .docx, PDF, or .txt formats  
- Extract content from uploaded notes and display for user review  

**Week 4**  
- Automatically generate flashcards from extracted content  
- Allow users to specify the number of flashcards to generate  
- Support multiple question types: multiple-choice, true/false, fill-in-the-blank  

**Week 5**  
- Create quizzes from uploaded notes  
- Provide feedback on quiz answers (correct/incorrect)

---

### Sprint 2

**Week 6**  
- Implement categorization for flashcards, quizzes, and notes  
- Allow filtering and searching by category  

**Week 7**  
- Implement flashcard review mode with question/answer flips  
- Track user progress during review  

**Week 8**  
- Finalize the review mode with right/wrong marking and progress tracking  

**Week 9**  
- Test and refine all features, focusing on the review mode  
- Fix bugs and improve UI/UX  

**Week 10**  
- Full testing, bug fixes, and performance optimization  

**Week 11**  
- Final testing, documentation, and project demo

---

# Questions?
