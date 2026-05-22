# PrediQs AI — App Store Metadata

## App Name
PrediQs AI - Sports Intelligence

## Subtitle (30 chars max)
AI Sports Analysis & Picks

## Bundle / Package IDs
- iOS Bundle Identifier: `com.prediqsai.app`
- Android Package: `com.prediqsai.app`
- Version: 1.0.0 | Build: 1 | Android versionCode: 1

## Description

PrediQs AI is an educational sports intelligence platform powered by advanced AI analysis.

⚠️ For educational and informational purposes only. We do not accept bets.

**FEATURES**

⚡ AI Match Analysis
Get AI-powered statistical analysis for NFL, NBA, MLB and Soccer matches worldwide including World Cup 2026

🔄 ARB Scanner
Educational odds comparison tool showing discrepancies across 40+ bookmakers simultaneously

📋 Slip Analyzer
Upload any bet slip for instant AI educational review of every selection with detailed breakdown

🤖 Oracle AI Assistant
Ask any sports question and get instant expert educational response powered by advanced AI

💰 Bankroll Education
Learn proper bankroll management with Kelly Criterion calculator and performance tracking tools

🏆 World Cup 2026
Full coverage of all 104 matches with AI statistical analysis for the biggest sporting event of 2026

📚 Sports Betting Academy
Educational content from beginner to advanced sports analytics

## Keywords
sports analysis, AI predictions, football tips, NFL picks, soccer analysis, sports intelligence, betting education, World Cup 2026, NBA analysis, sports AI

## Category
Sports

## Age Rating
17+

## Price
Free (with Premium upgrade)

## Support URL
https://prediqsai.com/support

## Privacy Policy URL
https://prediqsai.com/privacy

## EAS Build Commands
```bash
npm install -g eas-cli
eas login
eas build:configure

# iOS production build
eas build --platform ios --profile production

# Android production build
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Checklist Before Submission

### Legal
- [x] Privacy Policy screen
- [x] Terms of Service screen
- [x] Responsible Gambling screen
- [x] Disclaimer popup on first launch (onboarding step 0)
- [x] Age verification (18+) checkbox in onboarding
- [x] Educational disclaimer footer on every tab screen

### Design
- [x] App icon (1024×1024) — dark navy, cyan P+lightning, gold glow
- [x] Splash screen — dark navy, centered logo
- [x] Dark theme consistent throughout
- [x] No "Claude" or "ChatGPT" text visible to users
- [x] No placeholder or Lorem ipsum text
- [x] DEV MODE hidden from regular users (admin only)

### Build Config
- [x] slug: prediqsai
- [x] bundleIdentifier: com.prediqsai.app
- [x] package: com.prediqsai.app
- [x] eas.json created with development/preview/production profiles
