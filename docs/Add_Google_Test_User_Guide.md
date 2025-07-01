# Add Yourself as Google OAuth Test User

## 🎯 You Need To Add Yourself as a Test User

The error "can only be accessed by developer-approved testers" means you need to add your email (`samit403@gmail.com`) as a test user.

## 📋 Step-by-Step Instructions

### 1. Go to Google Cloud Console
- Open: https://console.cloud.google.com
- Make sure you're signed in with the same Google account you used to create the OAuth credentials

### 2. Select Your Project
- Look for project selector at the top
- Select your "DeckCraft AI" project (or whatever you named it)

### 3. Navigate to OAuth Consent Screen
- In the left sidebar, click **"APIs & Services"**
- Click **"OAuth consent screen"**

### 4. Add Test User
- Scroll down to find the **"Test users"** section
- Click the **"ADD USERS"** button
- Enter your email: `samit403@gmail.com`
- Click **"SAVE"**

### 5. Test Again
- Go back to the OAuth URL in your browser
- You should now be able to proceed without the "Access blocked" error
- Grant permissions when prompted
- You should be redirected to: `http://localhost:8000/api/v1/auth/google/callback`

## 🔄 Fresh OAuth URL
After adding yourself as a test user, use this URL:

```
https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fpresentations%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&prompt=consent&include_granted_scopes=true&state=7bafa13bf679d0209582024717b32afd5448f7ca677d20a120ac07bcf6db544d&response_type=code&client_id=656789619003-qaeenrg1g6mu0mdp3e3qp5f5n3t8hp4g.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback
```

## ✅ Expected Success Response
After successful OAuth, you should see:

```json
{
  "success": true,
  "message": "Google authentication successful",
  "user_id": "demo-user-id",
  "scopes": ["https://www.googleapis.com/auth/presentations", "..."]
}
```

## 🛠️ If You Can't Find the Project or OAuth Consent Screen

1. **Make sure you're in the right Google account** (the one that created the OAuth credentials)
2. **Project might be under a different name** - look for any project you created recently
3. **Try this direct link** to OAuth consent screen: https://console.cloud.google.com/apis/credentials/consent
4. **If still stuck**, you can create a new project and OAuth credentials

---

**Adding yourself as a test user is the cleanest solution for development testing!**
