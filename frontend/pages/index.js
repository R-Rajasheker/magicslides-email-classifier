import { useEffect, useState } from 'react';

export default function Home() {
  const [gUser, setGUser] = useState(null);
  const [token, setToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [count, setCount] = useState(15);
  const [openaiKey, setOpenaiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // Loading states
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingClassify, setLoadingClassify] = useState(false);

  // Read env variables
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000';

  useEffect(() => {
    const k = localStorage.getItem('openai_key') || '';
    setOpenaiKey(k);
    if (k) setKeySaved(true);
    const stored = localStorage.getItem('ms_emails');
    if (stored) setEmails(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!window.google) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {},
      });
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [GOOGLE_CLIENT_ID]);

  async function signIn() {
    try {
      const clientId = GOOGLE_CLIENT_ID;
      const redirectUri = REDIRECT_URI;
      const scope = encodeURIComponent(
        'https://www.googleapis.com/auth/gmail.readonly profile email'
      );
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=consent&access_type=online`;
      const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600');
      if (!popup) {
        alert('Popup blocked. Please allow popups for this site.');
        return;
      }
      const poll = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(poll);
            return;
          }
          if (
            popup.location.href.startsWith(redirectUri) &&
            popup.location.hash
          ) {
            const hash = popup.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            if (accessToken) {
              clearInterval(poll);
              popup.close();
              setToken(accessToken);
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: 'Bearer ' + accessToken },
              })
                .then((r) => r.json())
                .then((user) => setGUser(user));
            }
          }
        } catch (err) {}
      }, 500);
    } catch (err) {
      console.error(err);
      alert('Signin failed: ' + err.message);
    }
  }

  function saveOpenAIKey() {
    localStorage.setItem('openai_key', openaiKey);
    setKeySaved(true);
    alert('OpenAI key saved to localStorage.');
  }

  async function fetchEmails() {
    if (!token) {
      alert('Sign in with Google first');
      return;
    }
    setLoadingFetch(true);
    try {
      const listRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${count}`,
        {
          headers: { Authorization: 'Bearer ' + token },
        }
      );
      const listJson = await listRes.json();
      const msgs = listJson.messages || [];
      const out = [];
      for (const m of msgs) {
        const r = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
          {
            headers: { Authorization: 'Bearer ' + token },
          }
        );
        const j = await r.json();
        const headers = (j.payload?.headers || []).reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {});
        out.push({
          id: j.id,
          threadId: j.threadId,
          snippet: j.snippet,
          subject: headers['Subject'] || '',
          from: headers['From'] || '',
          date: headers['Date'] || '',
          rawPayload: j.payload,
        });
      }
      setEmails(out);
      localStorage.setItem('ms_emails', JSON.stringify(out));
      alert('Fetched ' + out.length + ' messages and saved to localStorage.');
    } catch (e) {
      console.error(e);
      alert('Failed to fetch emails: ' + e.message);
    }
    setLoadingFetch(false);
  }

  async function classify() {
    if (!emails.length) {
      alert('No emails to classify. Fetch first.');
      return;
    }
    const key = localStorage.getItem('openai_key') || openaiKey;
    if (!key) {
      alert('Enter your OpenAI key first');
      return;
    }
    setLoadingClassify(true);
    try {
      const res = await fetch(`${API_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emails.slice(0, count), openaiKey: key }),
      });
      const json = await res.json();
      if (json.error) {
        alert('Error: ' + json.error);
        setLoadingClassify(false);
        return;
      }
      const mapped = emails.map((e) => ({
        ...e,
        category: json.classifications[e.id] || 'General',
      }));
      setEmails(mapped);
      localStorage.setItem('ms_emails', JSON.stringify(mapped));
      alert('Classification complete. Saved to localStorage.');
    } catch (e) {
      console.error(e);
      alert('Classification failed: ' + e.message);
    }
    setLoadingClassify(false);
  }

  const showLanding = !(gUser && token && keySaved && openaiKey);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-200 to-gray-400 flex flex-col items-center justify-center">
      {showLanding ? (
        <div className="max-w-lg w-full rounded-xl shadow-xl bg-white p-10 flex flex-col gap-8 items-center">
          <h1 className="text-2xl font-mono text-gray-800 text-center mb-2">MagicSlides Email Classifier</h1>
          <button
            onClick={signIn}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold w-full"
          >
            {gUser ? "Re-authenticate Google" : "Sign in with Google"}
          </button>
          <div className="w-full flex flex-col gap-2">
            <label className="font-semibold text-gray-700">OpenAI Key:</label>
            <input
              value={openaiKey}
              onChange={e => {
                setOpenaiKey(e.target.value);
                setKeySaved(false);
              }}
              className="border border-gray-300 focus:border-indigo-500 outline-none px-3 py-2 rounded w-full transition"
              placeholder="sk-...your-openai-api-key..."
            />
            <button
              onClick={saveOpenAIKey}
              className="mt-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white transition"
            >
              Save OpenAI Key
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto w-full py-8">
          <div className="bg-white rounded-xl shadow p-7 mb-8 flex flex-col md:flex-row items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-gray-700">Fetch count:</label>
              <input
                type="number"
                value={count}
                min={1}
                max={100}
                onChange={e => setCount(Number(e.target.value))}
                className="w-24 border border-gray-300 focus:border-indigo-500 px-2 py-2 rounded"
              />
              <button
                onClick={fetchEmails}
                disabled={loadingFetch || loadingClassify}
                className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition shadow ${
                  loadingFetch || loadingClassify ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loadingFetch ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Fetching...
                  </span>
                ) : 'Fetch Emails'}
              </button>
              <button
                onClick={classify}
                disabled={loadingFetch || loadingClassify}
                className={`px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition shadow ${
                  loadingFetch || loadingClassify ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loadingClassify ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Classifying...
                  </span>
                ) : 'Classify'}
              </button>
            </div>
            <div className="text-sm text-green-700 font-medium bg-white/80 px-3 py-1 rounded shadow">
              Signed in: {gUser?.name || gUser?.email}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Fetched Emails</h2>
            <div className="grid grid-cols-1 gap-6">
              {(loadingFetch || loadingClassify) ? (
                <div className="flex flex-col items-center py-16">
                  <svg className="animate-spin h-12 w-12 text-indigo-700 mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <div className="text-lg text-purple-700 font-semibold">
                    {loadingFetch ? 'Fetching emails...' : 'Classifying emails...'}
                  </div>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-gray-500 px-4 py-10 rounded bg-gray-50 shadow">
                  No emails fetched yet. Click <span className="font-semibold text-indigo-600">Fetch Emails</span>.
                </div>
              ) : (
                emails.map(e => (
                  <div
                    key={e.id}
                    className="bg-white rounded-xl shadow border hover:shadow-lg transition p-6"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">{e.from} • {e.date}</div>
                        <div className="font-bold text-lg text-indigo-800">{e.subject || '(No Subject)'}</div>
                        <div className="text-gray-700 mt-2 text-sm">{e.snippet}</div>
                      </div>
                      <div className="mt-3 md:mt-0 md:ml-10 flex md:flex-col items-end md:items-center gap-1">
                        <div className="text-xs text-gray-500">Category</div>
                        <div className={`mt-1 font-semibold px-3 py-1 rounded 
                          ${e.category === "Important" ? "bg-green-100 text-green-800" :
                            e.category === "Promotions" ? "bg-yellow-100 text-yellow-900" :
                            e.category === "Social" ? "bg-blue-100 text-blue-800" :
                            e.category === "Marketing" ? "bg-pink-100 text-pink-900" :
                            e.category === "Spam" ? "bg-red-100 text-red-800" :
                            "bg-gray-200 text-gray-800"
                          }`
                        }>
                          {e.category || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
