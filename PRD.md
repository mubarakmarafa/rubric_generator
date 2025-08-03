# Proof of Concept: AI-Powered Worksheet Rubric Generator

## Overview

A web app that allows users to upload an image of a worksheet question, input prompts to generate rubrics using AI, and visually define multi-step prompt workflows with automatic routing based on AI output. The app will support multimodal LLMs (image + text), model selection per prompt, and export/import of prompt chains for collaboration.

---

## Features

### 1. Image Upload and Display
- [x] User can upload an image of a worksheet question.
- [x] Image is displayed in the UI for reference and AI processing.
- [x] Clean, minimal dropzone with single dashed border
- [x] Seamless image display without card styling when uploaded
- [x] Hover overlay for image replacement

### 2. Prompt Input and AI Integration
- [x] Text field below the image for user to input a prompt.
- [x] On submission, the image and prompt are sent to a multimodal LLM (e.g., OpenAI GPT-4o).
- [x] The AI returns structured output (e.g., JSON rubric).

### 3. Display of AI Output
- [x] The generated rubric or output is displayed next to the uploaded image.
- [x] Progress indicators show current step execution in workflows.
- [x] Streamlined output showing only rubric criteria without step information
- [x] Clean, focused presentation without redundant question type information

### 4. Multi-Step Prompt Routing (Workflow)
- [x] Users can define multi-step prompt chains (e.g., first identify question type, then generate rubric).
- [x] Routing is automatic based on AI output (e.g., "if type == 'short_answer', go to X").
- [x] Each step can specify a prompt and conditions for routing.
- [x] Terminal conditions allow workflows to end after specific steps.
- [x] Previous step outputs can be referenced in subsequent prompts using {previous}.
- [x] Default workflow provided for common use cases:
  - Question type detection (short/long answer)
  - Short answer rubric generation (single criterion)
  - Long answer rubric generation (three bullet points)
- [x] Modern workflow editor with:
  - Three-column layout (sidebar, editor, output)
  - Dark mode support with carefully chosen color scheme
  - Click-to-edit functionality for prompts and titles
  - Proper disabled states and hover effects
  - Seamless workflow selector integration
  - Truncated prompt display with ellipsis
  - Consistent spacing and padding throughout
  - Improved error handling in workflow execution

### 5. Workflow Management
- [x] Create, edit, and delete workflows
- [x] Save workflows to local storage
- [x] Workflows persist across page reloads
- [x] Select and execute saved workflows
- [x] Default workflow automatically added for new users

### 6. Model Selection
- [ ] Users can select which AI model to use per prompt node (start with OpenAI models, future extensibility).
- [ ] API key management for different models.

### 7. Export/Import & Collaboration
- [ ] Users can export prompt chains/workflows as a `.json` or `.txt` file.
- [ ] Users can import shared workflows for editing and iteration.

### 8. (Future) User Management
- [ ] (Optional, for later) Support for multiple users/accounts.

---

## Technical Notes

- **Frontend:** React for UI components and state management
- **Storage:** Local storage for workflow persistence
- **AI Integration:** OpenAI GPT-4o (multimodal) for image analysis and text generation
- **Workflow Engine:** Custom implementation supporting:
  - Conditional routing
  - Step output parsing
  - Terminal conditions
  - Previous step reference
  - Progress tracking
  - Clean output formatting
- **UI Implementation:**
  - CSS Grid for responsive three-column layout
  - CSS Variables for theming and dark mode
  - Modern styling with consistent spacing and transitions
  - Proper disabled states and hover effects
  - Seamless workflow selector integration
  - Minimalist image upload interface
  - Focused output presentation

---

## Open Questions

- [ ] Should we add support for more complex routing conditions (regex, multiple conditions)?
- [ ] Should we allow branching and merging of workflow paths?
- [ ] How can we improve the workflow editing experience (visual editor vs. current form-based)?
- [ ] Should we add version control for workflows?
- [ ] Should we add customizable output formatting options?

---

## Progress Checklist

- [x] Image upload & display
- [x] Prompt input & AI integration
- [x] Display AI output
- [x] Basic workflow management
- [x] Workflow persistence
- [x] Default workflow implementation
- [x] Automatic prompt routing
- [x] Modern workflow editor UI
- [x] Clean output formatting
- [ ] Model selection per node
- [ ] Export/import workflows
- [ ] (Optional) User management

---

## Security Note (Internal Testing Only)

**For internal testing, the OpenAI API key is hardcoded in the frontend code. This means anyone with access to the deployed app can view and use the API key by inspecting the JavaScript.**

- This approach is NOT secure and should never be used in production or for public deployments.
- For production, move the API key to a secure backend or serverless function and never expose it to the client.
- See the code in `src/services/openaiService.js` for the current implementation.

---

## Dual Workspace UI/UX for Rubric & Student Feedback

### Overview
To support both rubric generation and student feedback/testing, the app will feature two main workspaces: a Rubric Workspace and a Student Workspace. Users can seamlessly switch between generating rubrics and testing student attempts with AI tutor feedback, including prompt experimentation and attempt history.

### 1. Workspace Switcher
- Top-level tabs or sidebar to switch between:
  - **Rubric Workspace**: For generating and editing rubrics from worksheet images.
  - **Student Workspace**: For student attempts, AI tutor feedback, and prompt experimentation.
- "Send to Student Workspace" button to transfer the current question and rubric for student testing.

### 2. Rubric Workspace
- Existing features: image upload, question detection, workflow editor, rubric output.
- New: Button to switch to Student Workspace with the current rubric/question loaded.

### 3. Student Workspace
- **Question & Rubric Display**: Read-only, loaded from Rubric Workspace.
- **Student Answer Input**: Text area and submit button for attempts.
- **AI Tutor Prompt Editor**: Card/panel to edit/test the AI tutor prompt (with presets and custom options).
- **Attempts & Feedback Timeline**: List/timeline of `{attempt, ai_feedback}` pairs, with options to clear/export.
- **Upload Handwritten Attempt (Optional)**: Dropzone for image upload, OCR/vision to extract attempt, editable detected text, submit as attempt.

### 4. Data Flow & State
- Rubric and question passed from Rubric Workspace to Student Workspace (in memory or local storage).
- Tutor prompt is editable and saved as a "tutor prompt object" (like workflow steps).
- Attempts and feedback stored in state (and optionally local storage).
- Export/import full session (rubric, question, tutor prompt, attempts, feedback) as JSON.

### 5. Optional: Experimentation & Analytics
- Prompt testing: Try different tutor prompts and see how feedback changes for the same attempts.
- History visualization: Show how hints evolve, "replay" sessions, compare prompt strategies.

### 6. Implementation Steps
1. Add workspace switcher (tabs/sidebar)
2. Refactor state to pass rubric/question between workspaces
3. Build Student Workspace UI (question/rubric display, tutor prompt editor, answer input, feedback timeline, handwritten upload)
4. Implement session memory for attempts/feedback
5. Support saving/loading tutor prompt objects
6. (Optional) Export/import session data

---

_Last updated: 2024-05-02_ 