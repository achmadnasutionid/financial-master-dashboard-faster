@echo off
echo ====================================
echo PUSHING TO GITHUB
echo ====================================
echo.

cd /d D:\CATARACTA\master-dashboard-faster

echo Step 1: Removing old git folder...
if exist .git (
    rmdir /s /q .git
    echo Old git removed!
) else (
    echo No old git found.
)
echo.

echo Step 2: Initializing fresh git...
git init
echo.

echo Step 3: Adding all files...
git add -A
echo.

echo Step 4: Creating commit...
git commit -m "Initial commit - Railway version"
echo.

echo Step 5: Renaming branch to main...
git branch -M main
echo.

echo Step 6: Adding GitHub remote...
git remote add origin https://github.com/achmadnasutionid/financial-master-dashboard-faster.git
echo.

echo Step 7: Pushing to GitHub...
git push -u origin main
echo.

echo ====================================
echo DONE!
echo ====================================
echo.
echo Check your GitHub repository:
echo https://github.com/achmadnasutionid/financial-master-dashboard-faster
echo.
pause
