# Release v3.2.0 — Archive Vault

> **Feature Release**: Introduces the **Archive Vault** to manage and store completed job cards, keeping your main board clean and focused.

## 🎯 Highlights

The **Archive Vault** allows you to move interested, applied, or rejected jobs off your active board into a dedicated "Vault". Archived jobs are preserved with their full history and can be restored at any time.

## ✨ What's New

### 📦 Archive Vault
- **Archive Action**: New "Archive 📦" button in the Job Detail panel.
- **Vault Modal**: View all archived jobs in a clean, list-based layout.
- **Restore Capability**: One-click restore to bring jobs back to the board with their original status.
- **Custom Confirmation**: dedicated, styled modal for archive actions (replacing browser alerts).

### 🎨 UI & Visualization
- **Journey Map Update**: The status timeline now includes "Archived" as a final stage.
- **Status Dropdown**: Fixed missing "Pending" status and optimized order.
- **Glassmorphism**: Enhanced modal styles for a modern feel.

## 📊 Technical Stats

| Metric | Value |
|--------|-------|
| Version | 3.2.0 |
| New Status | `archived` |
| New Tests | +4 (Archive/Reference checks) |
| Database Version | Schema v3.0 (Archive update) |

## 🔄 Migration Notes

### Database
Run the archive migration script to add the new status enum value:

```bash
docker exec -i jobboard-db psql -U jobboard_user -d jobboard < migration_v3_0_archive.sql
```

(Note: If you've been following the PRs, this might have already been applied).

### Deployment
```bash
# Pull latest changes
git pull origin main

# Rebuild (required for frontend changes)
docker-compose up -d --build
```

## 🐛 Bug Fixes
- **Status Dropdown**: Restored "Pending Next Step" option that was missing in some views.
- **Chrome Compatibility**: Fixed an issue where the native `confirm()` dialog would disappear or block the thread.

---

**Full Changelog**: [v3.1.2...v3.2.0](https://github.com/pachocamacho1990/personal-job-board/compare/v3.1.2...v3.2.0)
