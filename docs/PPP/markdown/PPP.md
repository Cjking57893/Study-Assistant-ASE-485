---
marp: true
theme: default
paginate: true
---


# StudyPal

---

### Project Description

StudyPal helps students learn more efficiently by turning notes into flashcards, quizzes, and practice questions.  
It generates personalized study tools that adapt to your learning needs, whether preparing for exams or reviewing class material.

---

### Problem Domain

Managing and retaining large study material is challenging.  
Current study tools require manual input, which is time-consuming and inefficient.  
StudyPal automates flashcard and quiz creation from existing notes, saving time and enhancing learning.

---

### Tools

- **DistilGPT-2** LLM for flashcard and question generation via Hugging Face API
- **React** for Front End
- **Node.js + Express** for Back End
- **PostgreSQL** for Database
- **Heroku** for deployment

---

# Features & Requirements (Part 1)

---

1. **Content Import**:  
   - Users can upload notes (e.g., .txt, .docx, PDF) for flashcard/quiz generation

2. **Flashcard Generation**:  
   - Auto-generate flashcards  
   - Specify number of flashcards  
   - Support multiple question types: multiple-choice, true/false, fill-in-the-blank

3. **Quiz Generation**:  
   - Create quizzes based on notes  
   - Support multiple-choice and short-answer questions  
   - Provide feedback (correct/incorrect)

---

# Features & Requirements (Part 2)

---

4. **Study Material Storage**:  
   - Store flashcards, quizzes, and notes  
   - View/edit study history

5. **Categorization**:  
   - Categorize study materials (e.g., "Math", "History")

6. **Flashcard Review Mode**:  
   - Review flashcards from selected decks  
   - Flip question/answer layout  
   - Track user progress

---

# Schedule: Sprint 1

---

**Week 1**  
- Finalize scope, tech stack, and features  
- Set up project structure  

**Week 2**  
- Implement user account system for flashcards, quizzes, and notes  
- Allow users to view and edit materials  

**Week 3**  
- Implement file upload (e.g., .docx, PDF, .txt)  
- Extract and display content  

---

**Week 4**  
- Auto-generate flashcards, allow user to specify number of flashcards  
- Support multiple question types  

**Week 5**  
- Create quizzes from notes  
- Provide feedback on answers  

---

# Schedule: Sprint 2

---

**Week 6**  
- Implement categorization for flashcards and quizzes  
- Allow filtering/searching  

**Week 7**  
- Implement flashcard review mode  
- Track user progress during review  

**Week 8**  
- Finalize review mode with right/wrong marking  

---

**Week 9**  
- Test and refine all features  
- Fix bugs and improve UI  

**Week 10**  
- Full testing, bug fixes, performance optimization  

**Week 11**  
- Final testing, documentation, project demo  

---

# Questions?