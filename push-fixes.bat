@echo off
echo ====================================
echo COMMITTING AND PUSHING FIXES
echo ====================================
echo.

cd /d D:\CATARACTA\master-dashboard-faster

echo Step 1: Adding files...
git add -A
echo.

echo Step 2: Committing...
git commit -m "Fix: Sync package.json and package-lock.json versions for Railway"
echo.

echo Step 3: Pushing to GitHub...
git push origin main
echo.

echo ====================================
echo DONE!
echo ====================================
echo.
echo Now go to Railway and check if rebuild started!
echo.
pause
