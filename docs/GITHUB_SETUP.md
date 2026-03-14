# GitHub connection setup

Your project is already a Git repo (cloned from the template). Follow these steps to connect it to **your** GitHub and push your work.

---

## 1. Set your Git identity (required for commits)

Run these once (use your real name and the email tied to your GitHub account):

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 2. Create a repo on GitHub

1. Go to [github.com](https://github.com) and sign in (or create an account).
2. Click **+** → **New repository**.
3. Name it (e.g. `sensai-inner-world` or `reflection-webxr`).
4. Choose **Private** or **Public**. Do **not** add a README, .gitignore, or license (you already have a repo).
5. Click **Create repository**. Leave the page open; you’ll need the repo URL.

---

## 3. Connect this folder to your GitHub repo

Right now `origin` points to the template repo. Add your repo as a new remote and push to it.

**Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.**

### Option A: HTTPS (simplest)

```powershell
cd "c:\Users\stern\OneDrive\Desktop\sensai"

# Add your repo as a remote (e.g. named "mygithub")
git remote add mygithub https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push your current branch to your repo (and set upstream)
git push -u mygithub main
```

When Git asks for a password, use a **Personal Access Token (PAT)**, not your GitHub password.

- Create a token: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. Give it `repo` scope.
- Use the token as the password when `git push` prompts you.

### Option B: SSH (no password after setup)

**Generate an SSH key (one time):**

```powershell
ssh-keygen -t ed25519 -C "your.email@example.com" -f "$env:USERPROFILE\.ssh\id_ed25519" -N '""'
```

**Add the key to GitHub:**

1. Copy your public key:
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
   ```
2. GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**. Paste the key and save.

**Add your repo and push:**

```powershell
cd "c:\Users\stern\OneDrive\Desktop\sensai"
git remote add mygithub git@github.com:YOUR_USERNAME/YOUR_REPO.git
git push -u mygithub main
```

---

## 4. Optional: make your repo the default remote

If you want `git push` and `git pull` to use **your** repo by default:

```powershell
git remote rename origin upstream
git remote rename mygithub origin
```

Then `origin` is your repo and `upstream` is the original template (for pulling template updates later).

---

## Quick reference

| Step | Command / action |
|------|-------------------|
| Set identity | `git config --global user.name "..."` and `user.email "..."` |
| Create repo | github.com → New repository (no README) |
| Add your remote (HTTPS) | `git remote add mygithub https://github.com/USER/REPO.git` |
| Add your remote (SSH) | `git remote add mygithub git@github.com:USER/REPO.git` |
| Push | `git push -u mygithub main` |
| Auth (HTTPS) | Use a Personal Access Token when prompted for password |
