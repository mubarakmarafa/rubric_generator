# Worksheet Rubric Generator

An AI-powered tool for teachers that automatically generates rubrics for worksheet questions. Upload an image of a question, and get an appropriate grading rubric based on the question type.

## Features

- Image upload and question detection
- Automatic question type identification
- Type-specific rubric generation
- Customizable workflows
- Dark mode support
- Local storage persistence

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd worksheet-rubric-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your OpenAI API key:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add your environment variables in the Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add `VITE_OPENAI_API_KEY`

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build the project:
```bash
npm run build
```

3. Deploy:
```bash
netlify deploy
```

4. Add your environment variables in the Netlify dashboard:
   - Go to Site Settings > Environment Variables
   - Add `VITE_OPENAI_API_KEY`

## Usage

1. Upload an image of a worksheet question
2. The app will automatically detect the question type
3. Select a workflow or enter a custom prompt
4. Generate the rubric
5. Copy or export the generated rubric

## Important Notes

- Each team member needs their own OpenAI API key
- The app uses GPT-4 with vision capabilities
- Local storage is used for workflow persistence
- Dark mode is supported based on system preferences

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
