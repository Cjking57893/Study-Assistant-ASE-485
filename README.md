# StudyPal

## Project Description

StudyPal is an intelligent study assistant designed to help students learn more efficiently. With just a few simple inputs, users can turn their notes into flashcards, quizzers, and practice questions to help reinforce key concepts.   Whether you're preparing for exams or reviewing class material, this app generates personalized study tools that adapt to your learning needs.

## Problem Domain

Students today face the challenge of efficiently managing and retaining large amounts of study material. Traditional study methods like reading notes can be time-consuming and often ineffective. Existing study tools, such as flashcard apps and quizzes, require manual input forcing students to spend valuable time creating their own study materials.

This project aims to address these issues by providing an intelligent study assistant that automatically generates flashcards and quizzes from existing notes. With these generated study tools it will help students engage with their material more effectively, saving time and enhancing learning through interactive, personalized tools.

## Tools
- DistilGPT-2 LLM for generation of flashcards and questions, going to utilize this through hugging face API
- React for Front End
- Node.js + Express for Back End
- PostgreSQL for Database
- Heroku for deployment

### Features & Requirements

# Features
   1. Content Import:
     - Allow users to upload notes (e.g. .txt, .docx, PDF) for flashcard and quiz generation
   2. Flashcard Generation:
     - Automatically generate flashcards from user-uploaded notes
     - Allow the user to specify the number of flashcards they want to create
     - Include multiple different types of questions for the flashcards: multiple-choice, true/false, and fill-in-the-blank
   3. Quiz Generation:
     - Create quizzes based on the user's notes
     - Support multiple-choice questions and short-answer questions
     - Provide the user with feedback (correct/incorrect) for each quiz question
   4. Study Material Storage:
     - Store flashcards, quizzes, and study materials for each user in their account, allowing them to come back and review later
     - Users can view their study history, including previously generated flashcards and quizzes
   5. Categorization:
     - Allow users to categorize their study materials (e.g. "Math", "History", "Biology", "Midterm Review") allowing them to easily find and review materials based on subject or topic
   6. Flashcard Review Mode:
     - Provide a review mode where users can review flashcards from selected decks
     - Present flashcards in visually appealing way by showing question first then allowing user to flip and then show answer
     - Allow user to mark questions as right or wrong and track study progress to show user how well they are learning topic
# Requirements
  1. Content Import:
     - Users should be able to upload notes in various formats such as .txt, .docx, PDF
  2. Flashcard Generation:
     - The app should automatically generate flashcards from the extracted contents from user notes
     - The app should identify key concepts, questions, and answers from the uploaded material and turn them into flashcards
     - The user should be able to specify how many flashcards they want to generate using the app
     - The app should support multiple question types (true/false, fill in the blank, multiple choice) with the ability to customize the output based on what the user wants
  3. Quiz Generation:
     - The app should automatically generate quizzes based on the user-uploaded notes
     - The app should include multiple types of questions in the quizzes (true/false, fill in the blank, multiple choice) with the ability to customize the output based on what the user wants
     - The user should receive instant feedback on their answers, showing which questions were answered correctly or incorrectly
  4. Study Material Storage:
     - Store all user-generated content, including flashcards, quizzes, and uploaded notes in their account for future access and review
     - Provide users with the ability to view their study history, including previously generated flashcards, quizzes, and notes
     - Allow users to edit or delete flashcards and quizzes as needed
  5. Categorization:
     - Allow users to categorize their flashcards, quizzes, and notes based on subject or class (e.g. "Math", "History", "Biology", "Midterm Review")
  6. Flashcard Review Mode:
     - Implement a flashcard review mode where users can review their flashcards from selected decks
     - Provide an interactive review experience with question/answer flips
     - Allow a user to mark right or wrong to mark if they got a question right or wrong
     - Track user progress in review session to show them how well they are doing

  We have 6 features and 16 requirements.

## Tests

### Acceptance Tests

Coming Soon

### Integration Tests

Coming Soon

### E2E Tests

Coming Soon

## Project Documentation

- [Project Plan Presentation (PPP)](link-to-ppp)

## Schedule

### Sprint 1

Week 1
- Finalize project scope, tech stack, and features
- Prepare PPP
- Set up project structure

Week 2
- Implement user account system for storing flashcards, quizzes, and notes
- Allow users to view their study history and previously generated materials
- Provide the ability to edit or delete flashcards and quizzes

Week 3
- Implement file upload functionality for .docx, PDF, or .txt formats
- Extract content from uploaded notes and display for user review

Week 4
- Automatically generate flashcards from extracted content
- Allow users to specify the number of flashcards to generate
- Support multiple question types: multiple-choice, true/false, fill-in-the-blank

Week 5
- Create quizzes from uploaded notes
- Support multiple question types in quizzes (multiple-choice, true/false, short-answer)
- Provide instant feedback to the user on correct/incorrect answers
