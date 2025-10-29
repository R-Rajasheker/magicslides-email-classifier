
# MagicSlides Email Classifier

Full-Stack Engineer Intern Assignment

This project lets users log in via Google OAuth, fetch their latest emails from Gmail, and classify them into categories (Important, Promotions, Social, Marketing, Spam, General) using OpenAI GPT or a fallback demo classifier.

---

## Features

- **Google Sign-In**: Secure OAuth login for Gmail access
- **OpenAI API Key Input**: User provides their OpenAI key; stored in browser localStorage (never stored on server)
- **Fetch Emails**: Get last X emails from Gmail
- **Classify Emails**: Classify emails via OpenAI GPT or fallback mock demo when API quota is exceeded
- **Modern UI**: Built with Next.js and Tailwind CSS

---

## Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS
- **Backend**: Express.js
- **APIs**:
  - Google OAuth / Gmail API
  - OpenAI API (with fallback mock demo)

---

## Setup Instructions

### 1. Clone the Repository

git https://github.com/R-Rajasheker/magicslides-email-classifier.git
cd magicslides-email-classifier

text

---

### 2. Frontend Setup

cd frontend # or the directory containing your Next.js app
npm install

text

#### Configure Google OAuth

- Go to [Google Cloud Console](https://console.developers.google.com/)
- Create an OAuth 2.0 Client ID (Web)
- Add your `http://localhost:3000` (or live URL) as an authorized redirect URI
- Update your code or `.env.local`:
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

text
- **Add `theindianappguy@gmail.com` as a test user in Google Cloud Console** (required for assignment)

#### Run Frontend

npm run dev

text

Access app at: [http://localhost:3000](http://localhost:3000)

---

### 3. Backend Setup

cd backend # or the directory containing your Express server
npm install

text

#### (Optional) Mock Mode for Demo

If you have no OpenAI quota, set MOCK_CLASSIFY for fallback classification:
export MOCK_CLASSIFY=true # on Mac/Linux
set MOCK_CLASSIFY=true # on Windows (cmd)

text

#### Run Backend

node index.js

text
The backend runs at [http://localhost:4000](http://localhost:4000).

---

### 4. How to Use

1. **Sign in with Google** to authenticate and grant Gmail read access
2. **Enter your OpenAI API key** and save
3. **Click "Fetch Emails"** to get your last X emails
4. **Click "Classify"** to analyze emails
   - If OpenAI quota is exceeded, the fallback classifier is used

---

## Notes

- No database is required; emails and keys are stored in the browser
- Only test users added to Google Cloud can log in before app verification
- Update all API URLs if deploying

---

## Troubleshooting

- **OpenAI Quota/Billing Errors:** Mock classifier will auto-activate; check your OpenAI usage in [OpenAI dashboard](https://platform.openai.com/account/usage)
- **Google OAuth Errors:** Double-check your Google Cloud Console settings and authorized URIs

---

## Submission

Share your finished GitHub project link with `@theindianappguy` and send your submission email.
Test user (`theindianappguy@gmail.com`) must be added in Google OAuth before deploying.

---

## License

This assignment is for evaluation purposes only.



