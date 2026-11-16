# Screens — F004_ProfileManagement

## Screen List

| Screen Name | What User Sees | What User Can Do |
|------------|----------------|-----------------|
| ProfilePage / ProfileForm (REG001) | Form with name, username and bio (avatars and banners were removed; an initials circle is shown) | Edit and save profile information |
| ProfilePage / DeviceList (REG002) | List of active sessions with browser, OS, IP, and login time | Terminate a session on a remote device |

## User Journey

1. Student navigates to `/k/profile` and sees their ProfileForm pre-filled with current name, username and bio.
2. Student updates their name and bio, then clicks Save — changes are persisted and a success message is shown.
4. Student scrolls to the Change Password section, enters their current password and new password, then clicks Save — an email confirmation is sent and the password is updated.
5. Student scrolls to the Active Sessions section (DeviceList) and sees all devices where they are currently logged in, with browser, OS, and last active time.
6. Student clicks Delete on an old device session — that session is terminated and can no longer make API requests. The current session cannot be deleted from the list.
