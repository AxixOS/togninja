@echo off
echo Deploying build fixes to Heroku...

echo Step 1: Adding all changes to git...
git add .

echo Step 2: Committing changes...
git commit -m "Fix build errors: syntax issues in InboxSettings.tsx and add ES module type"

echo Step 3: Pushing to Heroku main branch...
git push origin main

echo Deployment initiated! Check Heroku dashboard for build status.
pause
