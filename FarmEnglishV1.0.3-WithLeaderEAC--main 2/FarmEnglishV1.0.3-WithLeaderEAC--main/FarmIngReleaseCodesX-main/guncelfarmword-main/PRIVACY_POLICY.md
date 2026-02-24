# Privacy Policy

This Privacy Policy applies to the FarmEnglish mobile application.

## 1. Data Controller

Data Controller:
Enis Atakan Çağırıcı
Developer of the FarmEnglish Application
Contact Email: enisatakann@gmail.com

## 2. Application Modes and Data Processing

FarmEnglish operates in three modes, each with different data handling:

### 2.1 Offline Mode

No personal data is collected or transmitted. All progress is stored **only on your device** (AsyncStorage).

### 2.2 Online Mode

In Online Mode, users sign in with a **username** to access competitive features. The following data is processed:

- **Username** (chosen by the user)
- **Scores and ranking** (leaderboard)
- **Game statistics** (match results, wins/losses)

This data is stored on **Google Firebase** (Firestore / Realtime Database). The developer does **not** operate or own any custom backend server. Firebase's privacy policy: https://firebase.google.com/support/privacy

### 2.3 Sesyap Mode (Voice Recognition)

In Sesyap Mode, users speak English words aloud, which are recognized via speech technology. In this mode:

- Voice audio is sent to **Google Speech Recognition API** for real-time word matching.
- Audio is processed **instantly** and is **not permanently stored** by the API.
- Word match results and progress data are stored on **Google Firebase**.
- The developer does **not** collect or store voice recordings on any personal server.

Google's privacy policy: https://policies.google.com/privacy

## 3. Information We Collect

### 3.1 Information Provided by Users

- Username (required for Online Mode)
- Optional nickname (Offline Mode)
- Quiz answers and learning interactions
- Learning progress (levels, scores, achievements)
- User preferences (sound, vibration settings)

### 3.2 Data Flow by Mode

| Data Type | Offline | Online | Sesyap |
|---|---|---|---|
| Username | Device only | Firebase | Firebase |
| Scores / Stats | Device only | Firebase | Firebase |
| Voice audio | None | None | Google API (transient) |
| Location / IP / Device ID | Not collected | Not collected | Not collected |

### 3.3 Automatically Collected Information

FarmEnglish does **not** use analytics, advertising SDKs, or tracking tools. No device identifiers, location data, or IP addresses are collected.

## 4. Purpose of Data Processing

- Providing core application functionality
- Managing user profiles and authentication (Online Mode)
- Tracking learning progress (quiz scores, levels)
- Enabling leaderboards and competitive features (Online Mode)
- Delivering voice-based word recognition (Sesyap Mode)
- Personalizing user experience

## 5. Third-Party Services

### Google Firebase (Online Mode & Sesyap Mode)
- **Services used:** Firestore / Realtime Database
- **Purpose:** Storing usernames, scores, and game statistics
- **Data location:** Google's servers (EU or US region)
- **Privacy policy:** https://firebase.google.com/support/privacy

### Google Speech Recognition API (Sesyap Mode)
- **Service:** Google Cloud Speech-to-Text
- **Purpose:** Converting user speech to text for word matching
- **Storage:** Audio is not permanently stored; sent only for real-time processing
- **Privacy policy:** https://policies.google.com/privacy

## 6. Data Storage and Security

- Offline mode data is stored securely on-device only
- Online and Sesyap mode data is stored on Google Firebase's secure infrastructure
- The developer does not operate a personal/custom backend server
- Firebase data is protected by encryption and access controls

## 7. Data Sharing

FarmEnglish:

- ❌ Does not sell personal data
- ❌ Does not share personal data for advertising or marketing
- ✅ Transmits data to Google Firebase (Online & Sesyap modes)
- ✅ Sends voice audio to Google Speech API (Sesyap mode, transient only)

Personal data may only be disclosed if required by law.

## 8. Data Retention

- **Device data:** Retained while the app is installed; deleted when the app is uninstalled
- **Firebase data:** Retained while account is active; deleted upon account deletion request
- **Voice audio:** Processed in real-time by Google Speech API; not permanently stored

## 9. User Rights

Users have the right to:

- Access their personal data
- Request correction of inaccurate data
- Request deletion of personal data (including Firebase records)
- Object to data processing
- Request data portability where technically feasible

Requests can be submitted via the contact email below.

## 10. Children's Privacy

- FarmEnglish is not specifically targeted at children.
- Users under 18 should use the application with parental supervision, particularly Online and Sesyap modes.

## 11. Policy Updates

- This Privacy Policy may be updated when necessary.
- Any changes will be communicated through application updates.

## 12. Compliance

This Privacy Policy is designed to comply with:

- Turkish Personal Data Protection Law (KVKK)
- General Data Protection Regulation (GDPR), where applicable

## 13. Contact

Email: enisatakann@gmail.com

Last Updated: February 25, 2026
FarmEnglish Application – Version 1.0.3
