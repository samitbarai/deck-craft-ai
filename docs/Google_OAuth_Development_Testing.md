# Google OAuth Development Testing Guide

## 🚨 "Access blocked: DeckCraft AI has not completed the Google verification process"

This is **NORMAL** for development! Google shows this warning for all unverified OAuth applications.

## ✅ How to Test During Development

### Option 1: Bypass the Warning (Recommended for Testing)
1. When you see the "Access blocked" message, look for:
   - **"Advanced"** link (usually at the bottom)
   - **"Go to DeckCraft AI (unsafe)"** link
   - **"Continue"** or **"Proceed anyway"** option

2. Click on the advanced/unsafe option to proceed with testing

3. Grant the requested permissions:
   - Google Slides access
   - Google Drive readonly access
   - Profile information

### Option 2: Add Test Users (Alternative)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "OAuth consent screen"
3. Scroll down to "Test users"
4. Add your email address as a test user
5. Test users can bypass the verification warning

## 🔧 For Production: Google Verification Process

When ready for production, you'll need to:

1. **Complete OAuth Consent Screen:**
   - Add app logo
   - Add privacy policy URL
   - Add terms of service URL
   - Provide detailed app description

2. **Submit for Verification:**
   - Upload demonstration video
   - Provide justification for each scope
   - Answer Google's security questions

3. **Wait for Approval:**
   - Process takes 1-6 weeks
   - Google may request additional information

## 🧪 Testing Steps (After Bypassing Warning)

1. **Click "Advanced" → "Go to DeckCraft AI (unsafe)"**
2. **Grant permissions**
3. **You should be redirected to:** `http://localhost:8000/api/v1/auth/google/callback`
4. **Expected success response:**
   ```json
   {
     "success": true,
     "message": "Google authentication successful",
     "user_id": "demo-user-id",
     "scopes": ["scope1", "scope2", "..."]
   }
   ```

## 🔍 If You Still Get Errors After Bypassing

Check for these common issues:

1. **Redirect URI Mismatch:**
   - Ensure Google Console has: `http://localhost:8000/api/v1/auth/google/callback`
   - Check for extra spaces or typos

2. **Scope Issues:**
   - Verify Google Slides API is enabled
   - Verify Google Drive API is enabled

3. **Database Connection:**
   - Backend needs database access to store tokens
   - Check if PostgreSQL is running and accessible

## ✅ Next Testing Steps

After successful OAuth:
1. Test authentication status: `curl http://localhost:8000/api/v1/auth/google/status`
2. Test Google Slides access: `curl http://localhost:8000/api/v1/auth/google/test`
3. Create your first presentation via API

---

**This warning is expected and normal for development. Just bypass it using the "Advanced" option!**
